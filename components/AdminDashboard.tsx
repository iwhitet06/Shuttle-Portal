import React, { useState } from 'react';
import { AppData, User, UserStatus, UserRole, Location, TripStatus, RouteType, LocationType, LogEntry } from '../types';
import { updateUserStatus, updateUserRole, toggleUserPermission, toggleLocation, addLocation, updateLocation, updateUserAllowedLocations, deleteLog, updateLog, deleteBusCheckIn } from '../services/supabaseService';
import { Users, MapPin, Activity, ShieldAlert, CheckCircle, XCircle, BarChart3, Eye, EyeOff, UserCog, User as UserIcon, ClipboardList, Calendar, Clock, Bus, ArrowRight, Search, Download, X, Plus, Building, Edit2, Save, ArrowDownCircle, History, FileText, ChevronRight, ChevronDown, Lock, Server, Trash2, ShieldCheck, CheckSquare, Square, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SearchableDropdown } from './SearchableDropdown';

interface AdminDashboardProps {
  data: AppData;
  refreshData: () => void;
  currentUser?: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, refreshData, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'users' | 'locations'>('overview');

  // Log Filtering
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [logLocationFilter, setLogLocationFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Check-in Filtering
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInLocationFilter, setCheckInLocationFilter] = useState('ALL');
  const [checkInDateFilter, setCheckInDateFilter] = useState('');

  // User Filtering
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [userLocationFilter, setUserLocationFilter] = useState<string>('ALL');

  // Location Form
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locType, setLocType] = useState<LocationType>(LocationType.HOTEL);

  // Permission Modal
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<User | null>(null);
  const [isRestrictedMode, setIsRestrictedMode] = useState(false);
  const [selectedAllowedLocationIds, setSelectedAllowedLocationIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  // Log Edit Modal
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editLogDriver, setEditLogDriver] = useState('');
  const [editLogCompany, setEditLogCompany] = useState('');
  const [editLogBusNo, setEditLogBusNo] = useState('');
  const [editLogPax, setEditLogPax] = useState(0);
  const [editLogTime, setEditLogTime] = useState('');

  const isFullAdmin = currentUser?.role === UserRole.ADMIN;

  const handleAction = async (action: () => Promise<void>) => {
    try {
        await action();
        refreshData();
    } catch (e) {
        console.error("Action failed:", e);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName) return;
    if (editingLocationId) {
        await updateLocation(editingLocationId, { name: locName, type: locType, address: locAddress });
        setEditingLocationId(null);
    } else {
        await addLocation(locName, locType, locAddress);
    }
    setLocName(''); setLocAddress(''); setLocType(LocationType.HOTEL);
    refreshData();
  };

  const startEditLocation = (loc: Location) => {
      setEditingLocationId(loc.id); setLocName(loc.name); setLocAddress(loc.address || ''); setLocType(loc.type);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditLocation = () => {
      setEditingLocationId(null); setLocName(''); setLocAddress(''); setLocType(LocationType.HOTEL);
  };

  const openPermissionsModal = (user: User) => {
      setManagingPermissionsUser(user);
      const allowed = user.permissions.allowedLocationIds;
      if (allowed === undefined) { setIsRestrictedMode(false); setSelectedAllowedLocationIds(new Set()); }
      else { setIsRestrictedMode(true); setSelectedAllowedLocationIds(new Set(allowed)); }
  };

  const closePermissionsModal = () => { setManagingPermissionsUser(null); setPermSearch(''); };

  const savePermissions = async () => {
      if (managingPermissionsUser) {
          const newAllowed = isRestrictedMode ? (Array.from(selectedAllowedLocationIds) as string[]) : undefined;
          await updateUserAllowedLocations(managingPermissionsUser.id, newAllowed);
          refreshData(); closePermissionsModal();
      }
  };

  const toggleAllowedLocation = (id: string) => {
      const next = new Set(selectedAllowedLocationIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedAllowedLocationIds(next);
  };

  const toggleAllVisibleLocations = (visibleIds: string[], select: boolean) => {
      const next = new Set(selectedAllowedLocationIds);
      visibleIds.forEach(id => { if (select) next.add(id); else next.delete(id); });
      setSelectedAllowedLocationIds(next);
  };

  // Log Edit
  const openEditLogModal = (log: LogEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingLog(log); setEditLogDriver(log.driverName); setEditLogCompany(log.companyName);
      setEditLogBusNo(log.busNumber); setEditLogPax(log.passengerCount);
      const d = new Date(log.timestamp);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setEditLogTime(d.toISOString().slice(0, 16));
  };

  const saveLogEdit = async () => {
      if (editingLog) {
          await updateLog(editingLog.id, {
              driverName: editLogDriver, companyName: editLogCompany, busNumber: editLogBusNo,
              passengerCount: editLogPax, timestamp: new Date(editLogTime).toISOString()
          });
          setEditingLog(null); refreshData();
      }
  };

  const handleDeleteLog = async (logId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm('Are you sure you want to delete this log?')) { await deleteLog(logId); refreshData(); }
  };

  const handleDeleteCheckIn = async (id: string) => {
      if(window.confirm('Delete this check-in record?')) {
          await deleteBusCheckIn(id);
          refreshData();
      }
  };

  // Helper for 12-hour time format
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true});
  };

  // Helper for HH:mm string to 12-hour format
  const formatTimeFromStr = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10));
    date.setMinutes(parseInt(m, 10));
    return date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true});
  };

  // Data
  const today = new Date().toLocaleDateString();
  const todaysLogs = data.logs.filter(l => new Date(l.timestamp).toLocaleDateString() === today);
  const totalLogs = todaysLogs.length;
  const activeTrips = data.logs.filter(l => l.status === TripStatus.IN_TRANSIT).length;
  const completedTripsToday = todaysLogs.filter(l => l.status === TripStatus.ARRIVED).length;
  const totalPassengersToday = todaysLogs.reduce((sum, log) => sum + log.passengerCount, 0);

  const hoursMap = new Array(24).fill(0);
  data.logs.forEach(log => { hoursMap[new Date(log.timestamp).getHours()]++; });
  const hourlyData = hoursMap.map((count, hour) => ({ time: `${hour}:00`, trips: count })).filter((_, i) => i >= 6 && i <= 20);

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown';
  const getUser = (id: string) => data.users.find(u => u.id === id);

  const filteredLogs = data.logs.filter(log => {
      const searchContent = `${log.driverName} ${log.companyName} ${log.busNumber}`.toLowerCase();
      return (!logSearch || searchContent.includes(logSearch.toLowerCase())) &&
             (statusFilter === 'ALL' || log.status === statusFilter) &&
             (!dateFilter || new Date(log.timestamp).toLocaleDateString('en-CA') === dateFilter) &&
             (logLocationFilter === 'ALL' || log.departLocationId === logLocationFilter || log.arrivalLocationId === logLocationFilter);
  }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredUsers = data.users.filter(u => {
      const search = userSearch.toLowerCase();
      return (u.firstName.toLowerCase().includes(search) || u.lastName.toLowerCase().includes(search) || u.phone.includes(search)) &&
             (userRoleFilter === 'ALL' || u.role === userRoleFilter) &&
             (userStatusFilter === 'ALL' || u.status === userStatusFilter) &&
             (userLocationFilter === 'ALL' || u.currentLocationId === userLocationFilter);
  });

  const activeUsers = filteredUsers.filter(u => u.status !== UserStatus.REVOKED);
  const revokedUsers = filteredUsers.filter(u => u.status === UserStatus.REVOKED);

  // Filter Check-ins
  const filteredCheckIns = (data.busCheckIns || []).filter(c => {
      // Date Filter: If empty, show TODAY's checkins by default, unless cleared explicitly? 
      // Requirement says "Add filters". Let's match log behavior: If date is empty, show ALL? 
      // Or default to today? Let's default to NO date filter means ALL history, but maintain separate 'todaysCheckIns' var for stats if needed.
      // Actually for fleet check-ins, recent is most important. 
      // Let's mirror the Log Logic: if date filter provided, match it. If not, match everything.
      
      const searchContent = `${c.driverName} ${c.companyName} ${c.busNumber}`.toLowerCase();
      return (!checkInSearch || searchContent.includes(checkInSearch.toLowerCase())) &&
             (checkInLocationFilter === 'ALL' || c.locationId === checkInLocationFilter) &&
             (!checkInDateFilter || new Date(c.timestamp).toLocaleDateString('en-CA') === checkInDateFilter);
  }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Default to today if no filters active? No, show all if "Today" isn't selected.
  // BUT, to keep the UI clean on initial load, maybe we should default the date picker to Today?
  // Let's just default to showing everything sorted by newest.

  const todaysCheckIns = data.busCheckIns.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString());

  const exportCSV = () => {
      alert("Exporting CSV..."); 
  };

  const isSystemAdminUser = (user: User) => {
      return user.phone === '000-000-0000';
  };

  const renderLogs = () => (
    // REMOVED 'overflow-hidden' here to allow dropdown to show
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col mt-6 relative">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={20} className="text-blue-600"/> Master Trip Logs</h3>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium"><Download size={16} /> Export CSV</button>
      </div>
      {/* Added 'relative z-20' to ensure filters stack above the table content */}
      <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-slate-200 relative z-20">
          <input type="text" placeholder="Search..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          <SearchableDropdown options={[{id:'ALL', name:'All Locs'}, ...data.locations]} value={logLocationFilter} onChange={setLogLocationFilter} placeholder="Location" compact />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm"><option value="ALL">All Status</option><option value={TripStatus.IN_TRANSIT}>In Transit</option><option value={TripStatus.ARRIVED}>Arrived</option></select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
      </div>
      {/* Table container has 'rounded-b-xl' to maintain the card look at the bottom */}
      <div className="overflow-x-auto max-h-[500px] rounded-b-xl relative z-10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b text-xs uppercase sticky top-0">
            <tr>
              <th className="p-4 w-8"></th>
              <th className="p-4">Status</th>
              <th className="p-4">Time</th>
              <th className="p-4">Route</th>
              <th className="p-4">Transport</th>
              <th className="p-4 text-center">Pax</th>
              <th className="p-4">Timing</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                const agent = getUser(log.userId);
                return (
                <React.Fragment key={log.id}>
                <tr onClick={() => setExpandedLogId(isExpanded ? null : log.id)} className={`hover:bg-slate-50 cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-4 text-slate-400">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === TripStatus.IN_TRANSIT ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                            {log.status === TripStatus.IN_TRANSIT ? 'In Transit' : 'Arrived'}
                        </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{formatTime(log.timestamp)}</div>
                      <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{getLocationName(log.departLocationId)} <span className="text-slate-400">&rarr;</span> {getLocationName(log.arrivalLocationId)}</div>
                      <div className="text-xs text-slate-400">{log.routeType === RouteType.HOTEL_TO_SITE ? 'Hotel to Site' : 'Site to Hotel'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{log.companyName}</div>
                      <div className="text-xs">Bus {log.busNumber} • {log.driverName}</div>
                    </td>
                    <td className="p-4 font-bold text-center">{log.passengerCount}</td>
                    <td className="p-4">
                        <div className="space-y-1">
                            {/* Actual Arrival */}
                            {log.status === TripStatus.ARRIVED && log.actualArrivalTime ? (
                                <div className="text-xs">
                                    <span className="text-green-600 font-bold">Arr:</span> <span className="font-mono">{formatTime(log.actualArrivalTime)}</span>
                                </div>
                            ) : null}
                            
                            {/* ETA - Prominent */}
                            {log.eta && (
                                <div className={`text-xs ${log.status === TripStatus.IN_TRANSIT ? 'bg-blue-50 text-blue-800 border border-blue-100' : 'text-slate-500'} px-2 py-1 rounded inline-block font-bold`}>
                                    <span className="uppercase text-[10px] opacity-70 mr-1">ETA:</span>
                                    {formatTimeFromStr(log.eta)}
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="p-4">
                        {isFullAdmin && (
                            <div className="flex gap-2">
                                <button onClick={(e) => openEditLogModal(log, e)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Edit"><Edit2 size={16}/></button>
                                <button onClick={(e) => handleDeleteLog(log.id, e)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Delete"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </td>
                </tr>
                {isExpanded && (
                    <tr className="bg-blue-50/30 animate-fadeIn">
                        <td colSpan={8} className="p-0">
                            <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Submitted By</div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                                            {agent ? agent.firstName[0] : '?'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">{agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent'}</div>
                                            {agent && <div className="text-xs text-slate-400">ID: {agent.id}</div>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Notes</div>
                                    <div className="bg-white border border-slate-200 p-2 rounded text-slate-700 italic">
                                        {log.notes || 'No notes provided.'}
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
    </div>
  );

  const renderOverview = () => (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Departures</div>
            <div className="text-2xl font-bold text-slate-800">{totalLogs}</div>
            <div className="text-xs text-slate-400 mt-1">Today</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Trips</div>
            <div className="text-2xl font-bold text-blue-600">{activeTrips}</div>
            <div className="text-xs text-slate-400 mt-1">In Transit</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{completedTripsToday}</div>
            <div className="text-xs text-slate-400 mt-1">Today</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pax</div>
            <div className="text-2xl font-bold text-slate-800">{totalPassengersToday}</div>
            <div className="text-xs text-slate-400 mt-1">Passengers moved</div>
          </div>
        </div>

        {/* 1. Logs Table */}
        {renderLogs()}

        {/* 2. Charts Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                Hourly Trip Volume
            </h3>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                    <defs>
                    <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                    />
                    <Area type="monotone" dataKey="trips" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTrips)" />
                </AreaChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>
  );

  const renderCheckIns = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative">
        <div className="p-4 border-b border-slate-200 bg-orange-50/30 flex justify-between items-center rounded-t-xl">
            <div>
                <h3 className="font-bold text-orange-900 flex items-center gap-2">
                    <ArrowDownCircle size={20} />
                    Fleet Check-ins
                </h3>
            </div>
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-bold">{filteredCheckIns.length}</span>
        </div>

        {/* Filters for Check-ins */}
        <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-200 relative z-20">
            <input type="text" placeholder="Search check-ins..." value={checkInSearch} onChange={e => setCheckInSearch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <SearchableDropdown options={[{id:'ALL', name:'All Locations'}, ...data.locations]} value={checkInLocationFilter} onChange={setCheckInLocationFilter} placeholder="Location" compact />
            <input type="date" value={checkInDateFilter} onChange={e => setCheckInDateFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        </div>

        <div className="overflow-x-auto max-h-[600px] relative z-10">
            {filteredCheckIns.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm">No check-ins match your filters.</div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-orange-50 font-bold text-orange-800 sticky top-0">
                        <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">Loc</th>
                            <th className="p-3">Bus</th>
                            <th className="p-3">Driver</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCheckIns.map(c => (
                            <tr key={c.id} className="hover:bg-orange-50/20 transition">
                                <td className="p-3">
                                    <div className="font-bold">{formatTime(c.timestamp)}</div>
                                    <div className="text-xs text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</div>
                                </td>
                                <td className="p-3">{getLocationName(c.locationId)}</td>
                                <td className="p-3">
                                    <div className="font-medium">{c.companyName}</div>
                                    <div className="text-xs text-slate-500">#{c.busNumber}</div>
                                </td>
                                <td className="p-3">{c.driverName}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleDeleteCheckIn(c.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Delete Check-in">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
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
              <th className="p-4">Assignments</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Permissions</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => {
                const isSysAdmin = isSystemAdminUser(user);
                return (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                   <div className="font-medium text-slate-800">
                        {user.firstName} {user.lastName}
                        {isSysAdmin && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase tracking-wide">SysAdmin</span>}
                   </div>
                   <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</div>
                </td>
                <td className="p-4 text-slate-500 font-mono">{user.phone}</td>
                <td className="p-4">
                    <div className="space-y-2">
                        {/* Station / Current Location */}
                        <div className="flex items-start gap-1.5">
                            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Station</span>
                                {user.currentLocationId ? (
                                    <span className="text-xs font-medium text-slate-700 block leading-tight">
                                        {getLocationName(user.currentLocationId)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Not stationed</span>
                                )}
                            </div>
                        </div>

                        {/* Assigned Worksites */}
                        <div className="flex items-start gap-1.5">
                            <Briefcase size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Targets</span>
                                {user.assignedWorksiteIds && user.assignedWorksiteIds.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {user.assignedWorksiteIds.map(id => (
                                            <span key={id} className="text-xs font-medium text-indigo-700 leading-tight">
                                                {getLocationName(id)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">No assignments</span>
                                )}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="p-4">
                    {/* Role Dropdown */}
                    <div className="relative w-32">
                        <select 
                            value={user.role}
                            disabled={isSysAdmin}
                            onChange={async (e) => {
                                const newRole = e.target.value as UserRole;
                                await updateUserRole(user.id, newRole);
                                refreshData();
                            }}
                            className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500' :
                                'bg-slate-50 text-slate-600 border-slate-200 focus:ring-slate-500'
                            }`}
                        >
                            <option value={UserRole.AGENT}>AGENT</option>
                            <option value={UserRole.ADMIN}>ADMIN</option>
                        </select>
                        {!isSysAdmin && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                                <ChevronDown size={12} />
                            </div>
                        )}
                    </div>
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
                    {!isSysAdmin && (
                        <>
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
                        </>
                    )}
                    {isSysAdmin && (
                        <span className="text-slate-400 text-xs italic flex items-center gap-1"><ShieldCheck size={14}/> Protected</span>
                    )}
                  </div>
                </td>
              </tr>
            )})}
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
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Lock size={20} className="text-blue-600" />
                            Location Access Control
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure visibility for <span className="font-semibold text-slate-700">{managingPermissionsUser.firstName} {managingPermissionsUser.lastName}</span>
                        </p>
                      </div>
                      <button onClick={closePermissionsModal} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                      <div className="mb-6 flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <div>
                              <div className="font-bold text-slate-800">Restrict Location Access?</div>
                              <div className="text-xs text-slate-500 mt-1">If OFF, the user can access ALL active locations in the system.</div>
                          </div>
                          <button 
                              onClick={() => setIsRestrictedMode(!isRestrictedMode)}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isRestrictedMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                          >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition shadow-sm ${isRestrictedMode ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                      </div>

                      {isRestrictedMode && (
                          <div className="space-y-4 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Allowed Locations</label>
                                 <div className="space-x-3 text-xs font-medium">
                                      <button 
                                          onClick={() => toggleAllVisibleLocations(data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).map(l => l.id), true)}
                                          className="text-blue-600 hover:underline"
                                      >
                                          Select All
                                      </button>
                                      <button 
                                          onClick={() => toggleAllVisibleLocations(data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).map(l => l.id), false)}
                                          className="text-slate-500 hover:underline"
                                      >
                                          Clear
                                      </button>
                                  </div>
                              </div>
                              
                              <div className="relative">
                                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                  <input 
                                      type="text" 
                                      placeholder="Search locations..." 
                                      value={permSearch}
                                      onChange={(e) => setPermSearch(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                  />
                              </div>

                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-72 overflow-y-auto divide-y divide-slate-100">
                                  {data.locations
                                      .filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase()))
                                      .map(loc => {
                                      const isSelected = selectedAllowedLocationIds.has(loc.id);
                                      return (
                                      <div 
                                        key={loc.id} 
                                        onClick={() => toggleAllowedLocation(loc.id)}
                                        className={`flex items-center px-4 py-3 cursor-pointer transition hover:bg-slate-50 ${isSelected ? 'bg-blue-50/30' : ''}`}
                                      >
                                          <div className={`flex-shrink-0 mr-3 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                                               {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{loc.name}</div>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                  {loc.type === LocationType.HOTEL ? (
                                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Hotel</span>
                                                  ) : (
                                                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">Worksite</span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )})}
                                  {data.locations.filter(l => l.isActive && l.name.toLowerCase().includes(permSearch.toLowerCase())).length === 0 && (
                                      <div className="p-8 text-center text-slate-400 text-sm">No locations found.</div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-6 border-t border-slate-200 bg-white flex justify-end space-x-3 rounded-b-xl">
                      <button 
                          onClick={closePermissionsModal}
                          className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={savePermissions}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 transform active:scale-[0.98]"
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
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-fadeIn">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Edit2 size={20} className="text-blue-600" />
                            Edit Trip Log
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">ID: {editingLog.id}</p>
                      </div>
                      <button onClick={() => setEditingLog(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Name</label>
                          <input 
                              type="text" 
                              value={editLogDriver} 
                              onChange={e => setEditLogDriver(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company</label>
                          <input 
                              type="text" 
                              value={editLogCompany} 
                              onChange={e => setEditLogCompany(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bus Number</label>
                              <input 
                                  type="text" 
                                  value={editLogBusNo} 
                                  onChange={e => setEditLogBusNo(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passengers</label>
                              <input 
                                  type="number" 
                                  value={editLogPax} 
                                  onChange={e => setEditLogPax(parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Time</label>
                          <input 
                              type="datetime-local" 
                              value={editLogTime} 
                              onChange={e => setEditLogTime(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                  </div>
                  
                  <div className="p-6 border-t border-slate-200 bg-white flex justify-end space-x-3 rounded-b-xl">
                      <button 
                          onClick={() => setEditingLog(null)}
                          className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={saveLogEdit}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 transform active:scale-[0.98] flex items-center gap-2"
                      >
                          <Save size={16} /> Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};