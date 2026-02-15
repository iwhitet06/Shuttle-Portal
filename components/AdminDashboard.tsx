import React, { useState } from 'react';
import { AppData, User, UserStatus, UserRole, Location, TripStatus, RouteType, LocationType } from '../types';
import { updateUserStatus, toggleUserRole, toggleUserPermission, toggleLocation, addLocation, updateLocation, updateUserAllowedLocations } from '../services/mockBackend';
import { Users, MapPin, Activity, ShieldAlert, CheckCircle, XCircle, BarChart3, Eye, EyeOff, UserCog, User as UserIcon, ClipboardList, Calendar, Clock, Bus, ArrowRight, Search, Download, X, Plus, Building, Edit2, Save, ArrowDownCircle, History, FileText, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SearchableDropdown } from './SearchableDropdown';

interface AdminDashboardProps {
  data: AppData;
  refreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'users' | 'locations'>('overview');

  // Log Filtering State
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [logLocationFilter, setLogLocationFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Row Expansion State for Master Logs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // User Filtering State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [userLocationFilter, setUserLocationFilter] = useState<string>('ALL');

  // Location Form State
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locType, setLocType] = useState<LocationType>(LocationType.HOTEL);

  // Permission Modal State
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<User | null>(null);
  const [isRestrictedMode, setIsRestrictedMode] = useState(false);
  const [selectedAllowedLocationIds, setSelectedAllowedLocationIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  const handleAction = (action: () => void) => {
    action();
    refreshData();
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName) return;

    if (editingLocationId) {
        updateLocation(editingLocationId, {
            name: locName,
            type: locType,
            address: locAddress
        });
        setEditingLocationId(null);
    } else {
        addLocation(locName, locType, locAddress);
    }
    
    setLocName('');
    setLocAddress('');
    setLocType(LocationType.HOTEL);
    refreshData();
  };

  const startEditLocation = (loc: Location) => {
      setEditingLocationId(loc.id);
      setLocName(loc.name);
      setLocAddress(loc.address || '');
      setLocType(loc.type);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditLocation = () => {
      setEditingLocationId(null);
      setLocName('');
      setLocAddress('');
      setLocType(LocationType.HOTEL);
  };

  // Permission Management Functions
  const openPermissionsModal = (user: User) => {
      setManagingPermissionsUser(user);
      const allowed = user.permissions.allowedLocationIds;
      if (allowed === undefined) {
          setIsRestrictedMode(false);
          setSelectedAllowedLocationIds(new Set());
      } else {
          setIsRestrictedMode(true);
          setSelectedAllowedLocationIds(new Set(allowed));
      }
  };

  const closePermissionsModal = () => {
      setManagingPermissionsUser(null);
      setPermSearch('');
  };

  const savePermissions = () => {
      if (managingPermissionsUser) {
          // Explicitly cast to string[] to resolve potential type inference issues with Array.from
          const newAllowed = isRestrictedMode ? (Array.from(selectedAllowedLocationIds) as string[]) : undefined;
          updateUserAllowedLocations(managingPermissionsUser.id, newAllowed);
          refreshData();
          closePermissionsModal();
      }
  };

  const toggleAllowedLocation = (id: string) => {
      const next = new Set(selectedAllowedLocationIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedAllowedLocationIds(next);
  };

  const toggleAllVisibleLocations = (visibleIds: string[], select: boolean) => {
      const next = new Set(selectedAllowedLocationIds);
      visibleIds.forEach(id => {
          if (select) next.add(id);
          else next.delete(id);
      });
      setSelectedAllowedLocationIds(next);
  };

  const toggleRow = (id: string) => {
      if (expandedLogId === id) setExpandedLogId(null);
      else setExpandedLogId(id);
  };

  // Metrics Data Prep
  const today = new Date().toLocaleDateString();
  const todaysLogs = data.logs.filter(l => new Date(l.timestamp).toLocaleDateString() === today);
  
  const totalLogs = todaysLogs.length; // Departures today
  const activeTrips = data.logs.filter(l => l.status === TripStatus.IN_TRANSIT).length;
  const completedTripsToday = todaysLogs.filter(l => l.status === TripStatus.ARRIVED).length;
  
  const totalPassengersToday = todaysLogs.reduce((sum, log) => sum + log.passengerCount, 0);

  // New Chart Logic: Hourly Volume (Peak Analysis)
  // Initialize hours 0-23
  const hoursMap = new Array(24).fill(0);
  data.logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hoursMap[hour]++;
  });

  const hourlyData = hoursMap.map((count, hour) => ({
    time: `${hour}:00`,
    trips: count,
    hourIndex: hour
  })).filter(h => h.trips > 0 || (h.hourIndex >= 6 && h.hourIndex <= 20)); // Keep core business hours visible

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown Loc';
  const getUser = (id: string) => data.users.find(u => u.id === id);

  // Filter Logic
  const filteredLogs = data.logs.filter(log => {
      const agent = getUser(log.userId);
      const agentName = agent ? `${agent.firstName} ${agent.lastName}` : '';
      const depName = getLocationName(log.departLocationId);
      const arrName = getLocationName(log.arrivalLocationId);

      const searchContent = `${log.driverName} ${log.companyName} ${log.busNumber} ${agentName} ${log.userId} ${depName} ${arrName}`.toLowerCase();
      
      const matchesSearch = !logSearch || searchContent.includes(logSearch.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchesDate = !dateFilter || new Date(log.timestamp).toLocaleDateString('en-CA') === dateFilter;
      const matchesLocation = logLocationFilter === 'ALL' || log.departLocationId === logLocationFilter || log.arrivalLocationId === logLocationFilter;

      return matchesSearch && matchesStatus && matchesDate && matchesLocation;
  }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // User Filter Logic
  const filteredUsers = data.users.filter(u => {
      const search = userSearch.toLowerCase();
      const matchesSearch = u.firstName.toLowerCase().includes(search) || 
             u.lastName.toLowerCase().includes(search) || 
             u.phone.includes(search);
      
      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
      const matchesLocation = userLocationFilter === 'ALL' || u.currentLocationId === userLocationFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesLocation;
  });
  
  const activeUsers = filteredUsers.filter(u => u.status !== UserStatus.REVOKED);
  const revokedUsers = filteredUsers.filter(u => u.status === UserStatus.REVOKED);

  const exportCSV = () => {
    const headers = ['Log ID', 'Date', 'Time', 'Status', 'Route', 'Departure', 'Arrival', 'Agent Name', 'Agent ID', 'Company', 'Bus #', 'Driver', 'Pax', 'ETA', 'Actual Arrival', 'Notes'];
    const rows = filteredLogs.map(log => {
       const agent = getUser(log.userId);
       return [
         log.id,
         new Date(log.timestamp).toLocaleDateString(),
         new Date(log.timestamp).toLocaleTimeString(),
         log.status,
         log.routeType,
         getLocationName(log.departLocationId),
         getLocationName(log.arrivalLocationId),
         agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown',
         log.userId,
         log.companyName,
         log.busNumber,
         log.driverName,
         log.passengerCount,
         log.eta,
         log.actualArrivalTime ? new Date(log.actualArrivalTime).toLocaleTimeString() : '',
         log.notes ? `"${log.notes.replace(/"/g, '""')}"` : ''
       ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trip_logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderLogs = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-6">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList size={20} className="text-blue-600"/> 
                Master Trip Logs
            </h3>
            <p className="text-xs text-slate-500">Search, filter, and export all trip records.</p>
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search logs & details..." 
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            />
          </div>
          
          <div>
             <SearchableDropdown 
                options={[{ id: 'ALL', name: 'All Route Locations' }, ...data.locations]}
                value={logLocationFilter}
                onChange={setLogLocationFilter}
                placeholder="All Route Locations"
                compact={true}
             />
          </div>

          <div>
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value as any)}
               className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
             >
               <option value="ALL">All Statuses</option>
               <option value={TripStatus.IN_TRANSIT}>In Transit</option>
               <option value={TripStatus.ARRIVED}>Arrived</option>
             </select>
          </div>

          <div>
             <input 
               type="date"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
               className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" 
             />
          </div>

          {(logSearch || statusFilter !== 'ALL' || dateFilter || logLocationFilter !== 'ALL') && (
            <div className="md:col-span-4 flex justify-end">
                <button 
                onClick={() => { setLogSearch(''); setStatusFilter('ALL'); setDateFilter(''); setLogLocationFilter('ALL'); }}
                className="flex items-center justify-center gap-1 text-slate-500 hover:text-red-600 text-sm font-medium transition"
                >
                <X size={16} /> Clear All Filters
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto max-h-[500px] border-t border-slate-200">
        <table className="w-full text-left text-sm relative border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 w-10"></th> {/* Expand Toggle */}
              <th className="p-4 min-w-[120px]">Status</th>
              <th className="p-4 min-w-[100px]">Date & Time</th>
              <th className="p-4 min-w-[200px]">Route Details</th>
              <th className="p-4 min-w-[180px]">Transport Details</th>
              <th className="p-4 text-center w-20">Pax</th>
              <th className="p-4 min-w-[100px]">Timing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 && (
                <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                        No logs found matching your criteria.
                    </td>
                </tr>
            )}
            {filteredLogs.map(log => {
              const agent = getUser(log.userId);
              const isExpanded = expandedLogId === log.id;
              
              return (
                <React.Fragment key={log.id}>
                <tr 
                    onClick={() => toggleRow(log.id)}
                    className={`hover:bg-blue-50/50 cursor-pointer border-b border-slate-50 transition ${isExpanded ? 'bg-blue-50/30' : ''}`}
                >
                  <td className="p-4 text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="p-4 align-top whitespace-nowrap">
                     <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                         log.status === TripStatus.IN_TRANSIT 
                         ? 'bg-green-50 text-green-700 border-green-200' 
                         : 'bg-slate-100 text-slate-600 border-slate-200'
                     }`}>
                        {log.status === TripStatus.IN_TRANSIT ? <Activity size={10} /> : <CheckCircle size={10} />}
                        {log.status === TripStatus.IN_TRANSIT ? 'In Transit' : 'Arrived'}
                     </span>
                  </td>
                  <td className="p-4 align-top whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-xs">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                        <span className="truncate max-w-[120px]" title={getLocationName(log.departLocationId)}>{getLocationName(log.departLocationId)}</span>
                        <ArrowRight size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]" title={getLocationName(log.arrivalLocationId)}>{getLocationName(log.arrivalLocationId)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {log.routeType === RouteType.HOTEL_TO_SITE ? 'Hotel → Site' : 'Site → Hotel'}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col text-sm space-y-0.5">
                       <span className="font-bold text-slate-800">{log.companyName}</span>
                       <span className="text-slate-600 flex items-center gap-1"><Bus size={12}/> Bus #{log.busNumber}</span>
                       <span className="text-slate-500 text-xs italic">Dr. {log.driverName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center align-top whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-bold border border-slate-200">
                       {log.passengerCount}
                    </span>
                  </td>
                  <td className="p-4 align-top whitespace-nowrap">
                    <div className="space-y-1">
                      {log.status === TripStatus.ARRIVED && log.actualArrivalTime ? (
                        <div className="text-xs">
                           <div className="font-bold text-green-700 flex items-center gap-1"><CheckCircle size={10} /> Arrived</div>
                           <span className="font-mono text-slate-600">{new Date(log.actualArrivalTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                      ) : (
                         <div className="text-xs text-slate-400 italic">Not arrived</div>
                      )}
                      
                      <div className="text-xs pt-1 border-t border-slate-100 mt-1">
                        <span className="text-slate-400 uppercase text-[10px] font-bold">ETA</span>
                        <div className="font-mono text-slate-600">{log.eta || '--:--'}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                    <tr className="bg-slate-50/50 animate-fadeIn">
                        <td colSpan={7} className="p-4 border-b border-slate-200">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                                <div>
                                    <h4 className="font-bold text-slate-500 text-xs uppercase mb-2 flex items-center gap-2">
                                        <FileText size={14} /> Trip Notes
                                    </h4>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-700 shadow-sm min-h-[80px]">
                                        {log.notes || <span className="text-slate-400 italic">No notes were added for this trip.</span>}
                                    </div>
                                </div>
                                <div className="text-sm bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                    <h4 className="font-bold text-slate-500 text-xs uppercase mb-2 border-b border-slate-100 pb-1">Agent Information</h4>
                                    <div>
                                        <span className="text-slate-400 text-xs block uppercase tracking-wide">Logged By</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="bg-indigo-100 text-indigo-700 p-1 rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                                                {agent ? agent.firstName[0] : '?'}
                                            </div>
                                            <span className="font-semibold text-slate-800">{agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown'}</span>
                                        </div>
                                        {agent && agent.role === UserRole.ADMIN && <span className="text-[10px] text-purple-600 font-bold ml-6 block">Admin</span>}
                                        {agent && <span className="text-[10px] text-slate-400 ml-6 block font-mono">ID: {agent.id}</span>}
                                    </div>
                                </div>
                             </div>
                        </td>
                    </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
       <div className="bg-slate-50 border-t border-slate-200 p-2 text-center text-xs text-slate-500">
        Showing {filteredLogs.length} records. Click on a row to view full details and notes.
      </div>
    </div>
  );

  const renderCheckIns = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
       <div className="p-6 border-b border-slate-200 bg-orange-50/30">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <ArrowDownCircle size={24} className="text-orange-600"/> 
              Fleet Check-ins
          </h3>
          <p className="text-sm text-slate-500 mt-1">
              Real-time log of buses arriving at hotels. Use this to monitor fleet availability and positioning.
          </p>
       </div>
       <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Arrival Time</th>
              <th className="p-4">Location (Hotel)</th>
              <th className="p-4">Bus Details</th>
              <th className="p-4">Driver</th>
              <th className="p-4">Logged By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {(data.busCheckIns || []).length === 0 && (
                 <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-400">No check-ins recorded yet.</td>
                 </tr>
             )}
             {[...(data.busCheckIns || [])].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => {
                 const agent = getUser(log.userId);
                 return (
                     <tr key={log.id} className="hover:bg-orange-50/30 transition">
                         <td className="p-4">
                             <div className="font-bold text-slate-800">{new Date(log.timestamp).toLocaleDateString()}</div>
                             <div className="text-xs text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                         </td>
                         <td className="p-4">
                             <div className="flex items-center gap-2">
                                 <Building size={16} className="text-slate-400" />
                                 <span className="font-medium text-slate-700">{getLocationName(log.locationId)}</span>
                             </div>
                         </td>
                         <td className="p-4">
                             <div className="text-sm font-semibold text-slate-800">{log.companyName}</div>
                             <div className="text-xs bg-slate-100 inline-block px-1.5 py-0.5 rounded text-slate-600 mt-1">Bus #{log.busNumber}</div>
                         </td>
                         <td className="p-4 text-slate-600">
                             {log.driverName}
                         </td>
                         <td className="p-4 text-slate-500 text-xs">
                             {agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent'}
                         </td>
                     </tr>
                 );
             })}
          </tbody>
        </table>
       </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Active Trips</div>
             <Activity size={16} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{activeTrips}</div>
          <div className="text-xs text-green-600 mt-1 font-medium">Currently on road</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pax Today</div>
             <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{totalPassengersToday}</div>
          <div className="text-xs text-slate-400 mt-1">Total passengers moved</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Completion Rate</div>
             <CheckCircle size={16} className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {totalLogs > 0 ? Math.round((completedTripsToday / totalLogs) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">{completedTripsToday} / {totalLogs} Trips</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Locations</div>
             <MapPin size={16} className="text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{data.locations.filter(l => l.isActive).length}</div>
          <div className="text-xs text-slate-400 mt-1">Active Stops</div>
        </div>
      </div>

      {/* Logs moved above Charts */}
      {renderLogs()}

      {/* Charts */}
      <div className="grid md:grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
             <BarChart3 className="w-5 h-5 text-indigo-500" /> <span>Peak Traffic Analysis (Hourly Volume)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6 -mt-3">Analyzing departure frequencies to identify staffing bottlenecks.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="trips" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTrips)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const UserTable = ({ users, title, isRevoked = false }: { users: User[], title: string, isRevoked?: boolean }) => (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isRevoked ? 'border-red-100 mt-8' : 'border-slate-200'}`}>
      <div className={`p-4 border-b ${isRevoked ? 'bg-red-50 border-red-100 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          <h3 className="font-bold flex items-center gap-2">
            {isRevoked ? <ShieldAlert size={18} /> : <UserIcon size={18} />}
            {title} ({users.length})
          </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`font-medium border-b ${isRevoked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            <tr>
              <th className="p-4">User Details</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Current Location</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Permissions</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-400">No users found matching filters.</td></tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                   <div className="font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                   <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</div>
                </td>
                <td className="p-4 text-slate-500 font-mono">{user.phone}</td>
                <td className="p-4">
                    {user.currentLocationId ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium border border-blue-100">
                            <MapPin size={10} />
                            {getLocationName(user.currentLocationId)}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-xs italic">Not set</span>
                    )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    user.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-700' :
                    user.status === UserStatus.PENDING ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4">
                   <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handleAction(() => toggleUserPermission(user.id, 'canViewHistory'))}
                        className={`p-1.5 rounded transition ${user.permissions.canViewHistory ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}
                        title="Toggle View History"
                    >
                        {user.permissions.canViewHistory ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                        onClick={() => openPermissionsModal(user)}
                        className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-bold px-2 ${
                            user.permissions.allowedLocationIds ? 'text-orange-600 bg-orange-50 border border-orange-200' : 'text-slate-600 bg-slate-100 border border-slate-200'
                        }`}
                        title="Manage Location Access"
                    >
                        <Lock size={14} />
                        {user.permissions.allowedLocationIds ? `${user.permissions.allowedLocationIds.length}` : 'All'}
                    </button>
                   </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    {user.status === UserStatus.PENDING && (
                      <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded" title="Approve">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    
                    {user.status !== UserStatus.REVOKED && (
                      <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.REVOKED))} className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded" title="Revoke Access">
                        <XCircle size={16} />
                      </button>
                    )}

                    {user.status === UserStatus.REVOKED && (
                      <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded" title="Restore Access">
                        <CheckCircle size={16} />
                      </button>
                    )}

                    <div className="w-px bg-slate-200 mx-1"></div>

                    <button 
                      onClick={() => handleAction(() => toggleUserRole(user.id))}
                      className={`p-2 rounded transition ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      title={user.role === UserRole.ADMIN ? "Demote to Agent" : "Promote to Admin"}
                    >
                       {user.role === UserRole.ADMIN ? <UserIcon size={16} /> : <ShieldAlert size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
       {/* User Search & Filters */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
           <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
           </div>
           
           <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
             <select 
               value={userRoleFilter}
               onChange={(e) => setUserRoleFilter(e.target.value as any)}
               className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-900"
             >
               <option value="ALL">All Roles</option>
               <option value={UserRole.ADMIN}>Admins</option>
               <option value={UserRole.AGENT}>Agents</option>
             </select>

             <select 
               value={userStatusFilter}
               onChange={(e) => setUserStatusFilter(e.target.value as any)}
               className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-900"
             >
               <option value="ALL">All Statuses</option>
               <option value={UserStatus.ACTIVE}>Active</option>
               <option value={UserStatus.PENDING}>Pending</option>
               <option value={UserStatus.REVOKED}>Revoked</option>
             </select>

             <div className="w-48">
                <SearchableDropdown 
                    options={[{ id: 'ALL', name: 'All Locations' }, ...data.locations]}
                    value={userLocationFilter}
                    onChange={setUserLocationFilter}
                    placeholder="All Locations"
                    compact={true}
                />
             </div>
           </div>
       </div>

       {/* Active Users Table */}
       {activeUsers.length > 0 && <UserTable users={activeUsers} title="Active & Pending Users" />}

       {/* Revoked Users Table */}
       {revokedUsers.length > 0 && (
         <UserTable users={revokedUsers} title="Revoked Users" isRevoked={true} />
       )}
       
       {activeUsers.length === 0 && revokedUsers.length === 0 && (
         <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-slate-200">
           No users match your current filters.
         </div>
       )}
    </div>
  );

  const renderLocations = () => (
    <div className="space-y-6">
       {/* Add/Edit Location Card */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {editingLocationId ? (
                        <>
                            <Edit2 className="text-white bg-orange-500 rounded-full p-1.5" size={28}/> 
                            <span>Edit Location</span>
                        </>
                    ) : (
                        <>
                            <Plus className="text-white bg-blue-600 rounded-full p-1" size={24}/> 
                            <span>Add New Location</span>
                        </>
                    )}
                </div>
                {editingLocationId && (
                    <button onClick={cancelEditLocation} className="text-sm text-slate-500 hover:text-slate-800 underline">
                        Cancel Edit
                    </button>
                )}
            </h3>
            <form onSubmit={handleLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                    <input 
                        type="text" 
                        value={locName}
                        onChange={e => setLocName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                        placeholder="e.g. Westin Downtown"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                    <div className="relative">
                      <select 
                          value={locType}
                          onChange={e => setLocType(e.target.value as LocationType)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-slate-900"
                      >
                          <option value={LocationType.HOTEL}>Hotel</option>
                          <option value={LocationType.WORKSITE}>Worksite</option>
                      </select>
                      <ArrowRight className="absolute right-3 top-2.5 text-slate-400 rotate-90" size={14} />
                    </div>
                </div>
                 <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address (Optional)</label>
                    <input 
                        type="text" 
                        value={locAddress}
                        onChange={e => setLocAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                        placeholder="123 Main St"
                    />
                </div>
                <button type="submit" className={`font-bold py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm text-white ${editingLocationId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                    {editingLocationId ? <Save size={16} /> : <Plus size={16} />} 
                    {editingLocationId ? 'Update Location' : 'Add Location'}
                </button>
            </form>
        </div>

      {/* List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
       <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Location Details</th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.locations.map(loc => (
              <tr key={loc.id} className={`hover:bg-slate-50 transition ${editingLocationId === loc.id ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                       <MapPin size={16} className="text-slate-400"/>
                       {loc.name}
                    </div>
                    {loc.address && (
                        <div className="text-xs text-slate-500 ml-6 mt-1">{loc.address}</div>
                    )}
                </td>
                <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${loc.type === LocationType.HOTEL ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                        {loc.type === LocationType.HOTEL ? <Building size={12}/> : <Activity size={12}/>}
                        {loc.type}
                    </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${loc.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {loc.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => startEditLocation(loc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                        >
                            <Edit2 size={16} />
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button 
                            onClick={() => handleAction(() => toggleLocation(loc.id))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loc.isActive ? 'bg-blue-600' : 'bg-slate-200'}`}
                            title="Toggle Status"
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${loc.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Console</h2>
          <p className="text-slate-500">Operational oversight and configuration.</p>
        </div>
        <div className="text-sm text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
           {new Date().toDateString()}
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-1 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center space-x-2">
            <Activity size={16} /> <span>Overview & Logs</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'checkins' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center space-x-2">
            <ArrowDownCircle size={16} /> <span>Fleet Check-ins</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center space-x-2">
            <UserCog size={16} /> <span>User Management</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'locations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
           <div className="flex items-center space-x-2">
            <MapPin size={16} /> <span>Locations</span>
          </div>
        </button>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'checkins' && renderCheckIns()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'locations' && renderLocations()}

      {/* Permissions Modal */}
      {managingPermissionsUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fadeIn">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Manage Location Access</h3>
                        <p className="text-sm text-slate-500">For {managingPermissionsUser.firstName} {managingPermissionsUser.lastName}</p>
                      </div>
                      <button onClick={closePermissionsModal} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="mb-6 flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div>
                              <div className="font-bold text-slate-800">Restrict Location Access?</div>
                              <div className="text-xs text-slate-500">If disabled, the user can access ALL active locations.</div>
                          </div>
                          <button 
                              onClick={() => setIsRestrictedMode(!isRestrictedMode)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRestrictedMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                          >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isRestrictedMode ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                      </div>

                      {isRestrictedMode && (
                          <div className="space-y-4">
                              <div className="relative">
                                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                  <input 
                                      type="text" 
                                      placeholder="Search locations..." 
                                      value={permSearch}
                                      onChange={(e) => setPermSearch(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>

                              <div className="flex justify-between items-center text-xs text-slate-500">
                                  <span>{selectedAllowedLocationIds.size} locations selected</span>
                                  <div className="space-x-2">
                                      <button 
                                          onClick={() => toggleAllVisibleLocations(data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).map(l => l.id), true)}
                                          className="text-blue-600 hover:underline"
                                      >
                                          Select All Visible
                                      </button>
                                      <button 
                                          onClick={() => toggleAllVisibleLocations(data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).map(l => l.id), false)}
                                          className="text-slate-600 hover:underline"
                                      >
                                          Deselect All Visible
                                      </button>
                                  </div>
                              </div>

                              <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                                  {data.locations
                                      .filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase()))
                                      .map(loc => (
                                      <div key={loc.id} className="flex items-center px-4 py-3 hover:bg-slate-50">
                                          <input 
                                              type="checkbox"
                                              id={`perm-${loc.id}`}
                                              checked={selectedAllowedLocationIds.has(loc.id)}
                                              onChange={() => toggleAllowedLocation(loc.id)}
                                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                          />
                                          <label htmlFor={`perm-${loc.id}`} className="ml-3 flex-1 cursor-pointer">
                                              <div className="text-sm font-medium text-slate-700">{loc.name}</div>
                                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                                  {loc.type === LocationType.HOTEL ? <Building size={10} /> : <Activity size={10} />}
                                                  {loc.type}
                                              </div>
                                          </label>
                                      </div>
                                  ))}
                                  {data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).length === 0 && (
                                      <div className="p-4 text-center text-slate-400 text-sm">No locations found.</div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
                      <button 
                          onClick={closePermissionsModal}
                          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={savePermissions}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};