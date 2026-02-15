import React, { useState } from 'react';
import { AppData, User, UserStatus, UserRole, Location, TripStatus, RouteType, LocationType, LogEntry } from '../types';
import { updateUserStatus, toggleUserRole, toggleUserPermission, toggleLocation, addLocation, updateLocation, updateUserAllowedLocations, deleteLog, updateLog } from '../services/supabaseService';
import { Users, MapPin, Activity, ShieldAlert, CheckCircle, XCircle, BarChart3, Eye, EyeOff, UserCog, User as UserIcon, ClipboardList, Calendar, Clock, Bus, ArrowRight, Search, Download, X, Plus, Building, Edit2, Save, ArrowDownCircle, History, FileText, ChevronRight, ChevronDown, Lock, Server, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SearchableDropdown } from './SearchableDropdown';

interface AdminDashboardProps {
  data: AppData;
  refreshData: () => void;
  currentUser?: User; // Passed to check roles
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, refreshData, currentUser }) => {
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

  // Log Edit Modal State
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editLogDriver, setEditLogDriver] = useState('');
  const [editLogCompany, setEditLogCompany] = useState('');
  const [editLogBusNo, setEditLogBusNo] = useState('');
  const [editLogPax, setEditLogPax] = useState(0);
  const [editLogTime, setEditLogTime] = useState('');

  const isFullAdmin = currentUser?.role === UserRole.ADMIN;

  const handleAction = async (action: () => Promise<void>) => {
    await action();
    refreshData();
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName) return;

    if (editingLocationId) {
        await updateLocation(editingLocationId, {
            name: locName,
            type: locType,
            address: locAddress
        });
        setEditingLocationId(null);
    } else {
        await addLocation(locName, locType, locAddress);
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

  const savePermissions = async () => {
      if (managingPermissionsUser) {
          const newAllowed = isRestrictedMode ? (Array.from(selectedAllowedLocationIds) as string[]) : undefined;
          await updateUserAllowedLocations(managingPermissionsUser.id, newAllowed);
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

  // Log Edit Functions
  const openEditLogModal = (log: LogEntry, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row toggle
      setEditingLog(log);
      setEditLogDriver(log.driverName);
      setEditLogCompany(log.companyName);
      setEditLogBusNo(log.busNumber);
      setEditLogPax(log.passengerCount);
      // Format time for datetime-local input (YYYY-MM-DDTHH:mm)
      const d = new Date(log.timestamp);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setEditLogTime(d.toISOString().slice(0, 16));
  };

  const saveLogEdit = async () => {
      if (editingLog) {
          await updateLog(editingLog.id, {
              driverName: editLogDriver,
              companyName: editLogCompany,
              busNumber: editLogBusNo,
              passengerCount: editLogPax,
              timestamp: new Date(editLogTime).toISOString()
          });
          setEditingLog(null);
          refreshData();
      }
  };

  const handleDeleteLog = async (logId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm('Are you sure you want to permanently delete this log?')) {
          await deleteLog(logId);
          refreshData();
      }
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
              {isFullAdmin && <th className="p-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 && (
                <tr>
                    <td colSpan={isFullAdmin ? 8 : 7} className="p-8 text-center text-slate-400">
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
                  {isFullAdmin && (
                      <td className="p-4 align-top text-right">
                          <div className="flex justify-end gap-2">
                              <button onClick={(e) => openEditLogModal(log, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit Log">
                                  <Edit2 size={16} />
                              </button>
                              <button onClick={(e) => handleDeleteLog(log.id, e)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete Log">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </td>
                  )}
                </tr>
                {isExpanded && (
                    <tr className="bg-slate-50/50 animate-fadeIn">
                        <td colSpan={isFullAdmin ? 8 : 7} className="p-4 border-b border-slate-200">
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
                                        {agent && (agent.role === UserRole.ADMIN || agent.role === UserRole.ONSITE_COORDINATOR) && <span className="text-[10px] text-purple-600 font-bold ml-6 block">{agent.role.replace('_', ' ')}</span>}
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
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Bus size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Total Departures</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalLogs}</div>
          <div className="text-xs text-slate-400 mt-1">Today</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600"><Activity size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Active Trips</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{activeTrips}</div>
          <div className="text-xs text-slate-400 mt-1">In Transit</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Users size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Passengers</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalPassengersToday}</div>
          <div className="text-xs text-slate-400 mt-1">Moved Today</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><CheckCircle size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Completed</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{completedTripsToday}</div>
          <div className="text-xs text-slate-400 mt-1">Arrivals Today</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-slate-400"/>
            Hourly Traffic Volume (24h)
        </h3>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                    <defs>
                        <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                        interval={2}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                    />
                    <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="trips" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTrips)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Logs Table */}
      {renderLogs()}
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-6 animate-fadeIn">
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
            <div className="flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserCog size={20} className="text-blue-600"/> 
                    User Management
                </h3>
            </div>
             {/* User Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div>
                    <select 
                       value={userRoleFilter}
                       onChange={(e) => setUserRoleFilter(e.target.value as any)}
                       className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                    >
                       <option value="ALL">All Roles</option>
                       <option value={UserRole.AGENT}>Agent</option>
                       <option value={UserRole.ONSITE_COORDINATOR}>Coordinator</option>
                       <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                 </div>
                 <div>
                    <select 
                       value={userStatusFilter}
                       onChange={(e) => setUserStatusFilter(e.target.value as any)}
                       className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                    >
                       <option value="ALL">All Statuses</option>
                       <option value={UserStatus.PENDING}>Pending</option>
                       <option value={UserStatus.ACTIVE}>Active</option>
                       <option value={UserStatus.REVOKED}>Revoked</option>
                    </select>
                 </div>
                 <div className="flex justify-end">
                      {(userSearch || userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') && (
                          <button onClick={() => { setUserSearch(''); setUserRoleFilter('ALL'); setUserStatusFilter('ALL'); }} className="text-xs text-red-500 font-medium">Clear Filters</button>
                      )}
                 </div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Access</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 && (
                         <tr><td colSpan={5} className="p-8 text-center text-slate-400">No users found.</td></tr>
                    )}
                    {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{user.firstName} {user.lastName}</div>
                                <div className="text-xs text-slate-500">{user.phone}</div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                    user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    user.role === UserRole.ONSITE_COORDINATOR ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {user.role.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="p-4">
                                 {user.status === UserStatus.PENDING && <span className="text-orange-600 font-bold text-xs flex items-center gap-1"><Clock size={12}/> Pending</span>}
                                 {user.status === UserStatus.ACTIVE && <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> Active</span>}
                                 {user.status === UserStatus.REVOKED && <span className="text-red-600 font-bold text-xs flex items-center gap-1"><XCircle size={12}/> Revoked</span>}
                            </td>
                            <td className="p-4">
                                <button 
                                    onClick={() => openPermissionsModal(user)}
                                    className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium border border-transparent hover:border-blue-200 flex items-center gap-1"
                                >
                                    <MapPin size={12} />
                                    {user.permissions.allowedLocationIds ? `${user.permissions.allowedLocationIds.length} Locations` : 'All Locations'}
                                </button>
                            </td>
                            <td className="p-4 text-right space-x-2">
                                {user.status === UserStatus.PENDING && (
                                    <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold hover:bg-green-200">Approve</button>
                                )}
                                {user.status === UserStatus.ACTIVE && (
                                    <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.REVOKED))} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">Revoke</button>
                                )}
                                {user.status === UserStatus.REVOKED && (
                                    <button onClick={() => handleAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold hover:bg-slate-200">Restore</button>
                                )}
                                <button onClick={() => handleAction(() => toggleUserRole(user.id))} className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold hover:bg-slate-200" title="Toggle Role">
                                    <ShieldAlert size={12} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderLocations = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn mt-6">
        {/* Location Form */}
        <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {editingLocationId ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                    {editingLocationId ? 'Edit Location' : 'Add New Location'}
                </h3>
                <form onSubmit={handleLocationSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Location Name</label>
                        <input 
                            type="text" 
                            value={locName} 
                            onChange={e => setLocName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="e.g. Marriott Downtown"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Address</label>
                        <input 
                            type="text" 
                            value={locAddress} 
                            onChange={e => setLocAddress(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="123 Main St..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setLocType(LocationType.HOTEL)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${locType === LocationType.HOTEL ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                            >
                                Hotel
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocType(LocationType.WORKSITE)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${locType === LocationType.WORKSITE ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                            >
                                Worksite
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        {editingLocationId && (
                            <button 
                                type="button" 
                                onClick={cancelEditLocation}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-sm transition"
                            >
                                Cancel
                            </button>
                        )}
                        <button 
                            type="submit" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition shadow-sm"
                        >
                            {editingLocationId ? 'Update Location' : 'Add Location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* Location List */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <MapPin size={20} className="text-blue-600" />
                        Active Locations
                    </h3>
                    <div className="text-xs text-slate-500">{data.locations.length} total</div>
                </div>
                <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                    {data.locations.map(loc => (
                        <div key={loc.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 group ${!loc.isActive ? 'opacity-60 bg-slate-50' : ''}`}>
                            <div>
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    {loc.name}
                                    {!loc.isActive && <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 rounded uppercase">Inactive</span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded border ${loc.type === LocationType.HOTEL ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                        {loc.type}
                                    </span>
                                    <span className="truncate max-w-[200px]">{loc.address}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button 
                                    onClick={() => startEditLocation(loc)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleAction(() => toggleLocation(loc.id))}
                                    className={`p-1.5 rounded ${loc.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                    title={loc.isActive ? "Deactivate" : "Activate"}
                                >
                                    {loc.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
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

       {/* --- SERVER CONNECTED BANNER --- */}
       <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
          <Server className="flex-shrink-0 mt-0.5" size={20} />
          <div>
              <strong className="block font-bold">Cloud Database Active</strong>
              <p>
                  You are connected to the live Supabase backend. All data is synchronized across devices in real-time.
              </p>
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
        {isFullAdmin && (
            <>
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
            </>
        )}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'checkins' && renderCheckIns()}
      {isFullAdmin && activeTab === 'users' && renderUsers()}
      {isFullAdmin && activeTab === 'locations' && renderLocations()}

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

      {/* Edit Log Modal */}
      {editingLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fadeIn">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800">Edit Log Entry</h3>
                      <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver</label>
                              <input 
                                  type="text" 
                                  value={editLogDriver} 
                                  onChange={e => setEditLogDriver(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company</label>
                              <input 
                                  type="text" 
                                  value={editLogCompany} 
                                  onChange={e => setEditLogCompany(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bus #</label>
                              <input 
                                  type="text" 
                                  value={editLogBusNo} 
                                  onChange={e => setEditLogBusNo(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pax</label>
                              <input 
                                  type="number" 
                                  value={editLogPax} 
                                  onChange={e => setEditLogPax(parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Time</label>
                          <input 
                              type="datetime-local" 
                              value={editLogTime} 
                              onChange={e => setEditLogTime(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
                      <button 
                          onClick={() => setEditingLog(null)}
                          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={saveLogEdit}
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