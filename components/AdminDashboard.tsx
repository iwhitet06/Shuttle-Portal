import React, { useState, Component, ReactNode, useMemo } from 'react';
import { AppData, User, UserStatus, UserRole, Location, TripStatus, RouteType, LocationType, LogEntry, ScheduledTrip, BusCheckIn, UserPermissions } from '../types';
import { updateUserStatus, updateUserRole, toggleUserPermission, toggleLocation, addLocation, updateLocation, updateUserAllowedLocations, deleteLog, updateLog, deleteBusCheckIn, updateUserProfile, syncScheduledTripsFromCSV, updateScheduledTripStatus, clearScheduledTrips } from '../services/supabaseService';
import { Users, MapPin, Activity, ShieldAlert, CheckCircle, XCircle, BarChart3, UserCog, User as UserIcon, ClipboardList, Calendar, Clock, Bus, ArrowRight, ArrowRightLeft, Search, Download, X, Plus, Building, Edit2, ArrowDownCircle, ChevronRight, ChevronDown, Lock, Trash2, ShieldCheck, Check, CheckSquare, Square, Briefcase, RefreshCw, Link as LinkIcon, AlertCircle, Loader2, HelpCircle, ExternalLink, CheckCircle2, Siren, Trash, Map, Info, MessageSquare, Filter, Sun, Moon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SearchableDropdown } from './SearchableDropdown';

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: any, errorInfo: any) { 
    console.error("AdminDashboard Crash:", error, errorInfo); 
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-6 rounded-xl border border-red-200 dark:border-red-800 inline-block max-w-lg text-left">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-2"><AlertCircle className="text-red-600" /> Dashboard Error</h3>
            <p className="text-sm mb-4">The dashboard encountered a problem rendering.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">Reload Page</button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- HELPER FUNCTIONS ---

const timeParseCache: Record<string, string> = {};
const parseTimeDisplay = (timeStr: string | undefined | null): string => {
    if (!timeStr || typeof timeStr !== 'string') return '-';
    const trimmed = timeStr.trim().toUpperCase();
    if (trimmed === '' || trimmed === '--:--') return '-';
    
    if (timeParseCache[trimmed]) return timeParseCache[trimmed];

    try {
        if (trimmed.includes('PM') || trimmed.includes('AM')) {
            timeParseCache[trimmed] = trimmed;
            return trimmed;
        }
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            let h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (!isNaN(h) && !isNaN(m)) {
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12; 
                const formatted = `${h}:${m.toString().padStart(2, '0')}${ampm}`;
                timeParseCache[trimmed] = formatted;
                return formatted;
            }
        }
    } catch (e) { return trimmed; }
    return trimmed; 
};

const getCurrentPstMinutes = (): number => {
    const now = new Date();
    const pstStr = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const pstDate = new Date(pstStr);
    return pstDate.getHours() * 60 + pstDate.getMinutes();
};

const getMinutesFromTimeStr = (timeStr: string): number | null => {
    if (!timeStr || timeStr === '--:--' || typeof timeStr !== 'string') return null;
    try {
        const parts = timeStr.split(':');
        if (parts.length < 2) return null;
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        
        if (timeStr.toUpperCase().includes('PM') && h < 12) h += 12;
        if (timeStr.toUpperCase().includes('AM') && h === 12) h = 0;
        
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    } catch (e) { return null; }
};

const getCurrentPstDay = (): string => {
    const now = new Date();
    return now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: 'long' });
};

// --- TIMELINE COMPONENT ---
const TimelinePoint = React.memo(({ label, time, currentMins }: { label: string; time: string; currentMins: number }) => {
    const timeMins = useMemo(() => getMinutesFromTimeStr(time), [time]);
    const isPast = timeMins !== null && currentMins >= timeMins;
    
    return (
        <div className="flex flex-col items-center gap-2 relative z-10 flex-1 px-1 group">
            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 shadow-sm ${isPast ? 'bg-blue-600 border-blue-600 scale-125' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}></div>
            <div className="flex flex-col items-center">
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isPast ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} mb-0.5 whitespace-nowrap`}>{label}</span>
                <span className={`text-[10px] font-mono font-bold ${isPast ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{parseTimeDisplay(time)}</span>
            </div>
        </div>
    );
});

// --- LIFECYCLE LOGIC ---
type LifecycleState = 'SCHEDULED' | 'STAGE_1' | 'TRANSIT_OUT' | 'STAGE_2' | 'TRANSIT_RET' | 'COMPLETE' | 'CANCELLED' | 'UNCONFIRMED';

interface TripLifecycle {
    state: LifecycleState;
    label: string;
    color: string;
    logs: { am?: LogEntry; pm?: LogEntry; checkIn?: BusCheckIn; };
    totalPax: number;
    amPax: number;
    pmPax: number;
}

const SHIFT_BOUNDARY_HOUR = 14; // 2:00 PM PST cutoff for AM vs PM matching

const getTripLifecycle = (trip: ScheduledTrip, dayLogs: LogEntry[], dayCheckIns: BusCheckIn[], isPastDay: boolean, isToday: boolean, currentMins: number): TripLifecycle => {
    if (trip.manualStatus === 'CANCELLED') return { state: 'CANCELLED', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-100', logs: {}, totalPax: 0, amPax: 0, pmPax: 0 };
    if (trip.manualStatus === 'COMPLETE') return { state: 'COMPLETE', label: 'Done', color: 'bg-green-50 text-green-700 border-green-100', logs: {}, totalPax: trip.manualStatusPax || 0, amPax: trip.manualStatusPax || 0, pmPax: 0 };

    if (!trip.isActive) return { state: 'CANCELLED', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-100', logs: {}, totalPax: 0, amPax: 0, pmPax: 0 };

    const isPMSchedule = !!trip.pmShiftStartTime && !trip.shiftStartTime;

    const checkIn = dayCheckIns.find(c => {
        const h = new Date(c.timestamp).getHours();
        const matchesShift = isPMSchedule ? h >= SHIFT_BOUNDARY_HOUR : h < SHIFT_BOUNDARY_HOUR;
        return c.locationId === trip.departLocationId && matchesShift;
    });

    const amLog = dayLogs.find(l => {
        const h = new Date(l.timestamp).getHours();
        const matchesShift = isPMSchedule ? h >= SHIFT_BOUNDARY_HOUR : h < SHIFT_BOUNDARY_HOUR;
        return l.routeType === RouteType.HOTEL_TO_SITE && 
               l.departLocationId === trip.departLocationId && 
               l.arrivalLocationId === trip.arrivalLocationId && 
               matchesShift;
    });

    const pmLog = dayLogs.find(l => {
        const h = new Date(l.timestamp).getHours();
        const matchesShift = isPMSchedule ? h >= SHIFT_BOUNDARY_HOUR : true; 
        return l.routeType === RouteType.SITE_TO_HOTEL && 
               l.departLocationId === trip.arrivalLocationId && 
               l.arrivalLocationId === trip.departLocationId && 
               matchesShift;
    });

    const logs = { am: amLog, pm: pmLog, checkIn };
    const amPax = amLog?.passengerCount || 0;
    const pmPax = pmLog?.passengerCount || 0;
    const totalPax = amPax + pmPax;

    if (pmLog && pmLog.status === TripStatus.ARRIVED) return { state: 'COMPLETE', label: 'Complete', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800', logs, totalPax, amPax, pmPax };
    if (pmLog && pmLog.status === TripStatus.IN_TRANSIT) return { state: 'TRANSIT_RET', label: 'In Transit (Return)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 animate-pulse', logs, totalPax, amPax, pmPax };
    if (amLog && amLog.status === TripStatus.ARRIVED) return { state: 'STAGE_2', label: 'At Site', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800', logs, totalPax, amPax, pmPax };
    if (amLog && amLog.status === TripStatus.IN_TRANSIT) return { state: 'TRANSIT_OUT', label: 'In Transit (Out)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse', logs, totalPax, amPax, pmPax };
    if (checkIn) return { state: 'STAGE_1', label: 'At Hotel', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800', logs, totalPax, amPax: 0, pmPax: 0 };

    if (!amLog && !pmLog && !checkIn) {
        const arrivalTimeField = isPMSchedule ? trip.busArrivalAtWorksite : trip.busArrivalAtHotel;
        const scheduledHotelArrivalMins = getMinutesFromTimeStr(arrivalTimeField);
        const hasPassedScheduledArrival = scheduledHotelArrivalMins !== null && currentMins >= (scheduledHotelArrivalMins + 15);
        if (isPastDay || (isToday && hasPassedScheduledArrival)) {
            return { state: 'UNCONFIRMED', label: 'Unconfirmed', color: 'bg-amber-50 text-amber-700 border-amber-200 border-dashed dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', logs, totalPax: 0, amPax: 0, pmPax: 0 };
        }
    }
    return { state: 'SCHEDULED', label: 'Scheduled', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600', logs, totalPax: 0, amPax: 0, pmPax: 0 };
};

// --- USER TABLE COMPONENT ---
interface UserTableProps {
  users: User[];
  title: string;
  isRevoked?: boolean;
  data: AppData;
  refreshData: () => void;
  onUpdateStation: (userId: string, locId: string | null) => Promise<void>;
  onUpdateTargets: (userId: string, val: any) => Promise<void>;
  onOpenPermissions: (user: User) => void;
  onAction: (action: () => Promise<void>) => Promise<void>;
}

const UserTable: React.FC<UserTableProps> = React.memo(({ users, title, isRevoked, data, refreshData, onUpdateStation, onUpdateTargets, onOpenPermissions, onAction }) => {
  const worksiteOptions = useMemo(() => data.locations.filter(l => l.type === LocationType.WORKSITE && l.isActive), [data.locations]);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center ${isRevoked ? 'bg-red-50 dark:bg-red-900/10' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
        <h3 className="font-bold flex items-center gap-2">
          {isRevoked ? <ShieldAlert size={18} className="text-red-500" /> : <Users size={18} className="text-blue-600" />}
          {title}
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{users.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b dark:border-slate-700">
            <tr><th className="p-3">User</th><th className="p-3">Current Station</th><th className="p-3">Assigned Target(s)</th><th className="p-3">Status/Role</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No users found.</td></tr>) : users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-3"><div className="font-bold text-slate-800 dark:text-slate-200">{user.firstName} {user.lastName}</div><div className="text-[10px] text-slate-500 font-mono uppercase">{user.phone}</div></td>
                <td className="p-3 w-48"><SearchableDropdown options={data.locations.filter(l => l.isActive)} value={user.currentLocationId || ''} onChange={(val: any) => onUpdateStation(user.id, val as string | null)} placeholder="Set Station" compact /></td>
                <td className="p-3 w-48"><SearchableDropdown options={worksiteOptions} value={user.assignedWorksiteIds || []} onChange={(val: any) => onUpdateTargets(user.id, val)} placeholder="Set Target(s)" compact multiple={user.role === UserRole.ADMIN} /></td>
                <td className="p-3"><div className="flex flex-col gap-1"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-center border ${user.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-700 border-green-200' : user.status === UserStatus.PENDING ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{user.status}</span><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-center border ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{user.role}</span></div></td>
                <td className="p-3 text-right"><div className="flex justify-end gap-1">{user.status === UserStatus.PENDING && <button onClick={() => onAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="p-2 text-green-600 hover:bg-green-50 rounded transition" title="Approve"><ShieldCheck size={18}/></button>}{user.status === UserStatus.ACTIVE && !isRevoked && <button onClick={() => onAction(() => updateUserStatus(user.id, UserStatus.REVOKED))} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Revoke Access"><XCircle size={18}/></button>}{isRevoked && <button onClick={() => onAction(() => updateUserStatus(user.id, UserStatus.ACTIVE))} className="p-2 text-green-600 hover:bg-green-50 rounded transition" title="Restore Access"><CheckCircle size={18}/></button>}<button onClick={() => onOpenPermissions(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Location Permissions"><Lock size={18}/></button><button onClick={() => onAction(() => updateUserRole(user.id, user.role === UserRole.ADMIN ? UserRole.AGENT : UserRole.ADMIN))} className="p-2 text-purple-600 hover:bg-purple-50 rounded transition" title="Toggle Role"><UserCog size={18}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// --- MAIN COMPONENT ---
interface AdminDashboardProps {
  data: AppData;
  refreshData: () => void;
  currentUser: User | null;
  theme: 'light' | 'dark';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, refreshData, currentUser, theme }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'all-trips' | 'users' | 'locations'>('overview');
  const [activeScheduleDay, setActiveScheduleDay] = useState('Monday');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [csvUrl, setCsvUrl] = useState(localStorage.getItem('shuttle_csv_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleShiftFilter, setScheduleShiftFilter] = useState<'ALL' | 'AM' | 'PM'>('ALL');
  const [scheduleLocationFilter, setScheduleLocationFilter] = useState<string>('ALL');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locType, setLocType] = useState<LocationType>(LocationType.HOTEL);
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<User | null>(null);
  const [selectedAllowedLocationIds, setSelectedAllowedLocationIds] = useState<Set<string>>(new Set());
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editLogPax, setEditLogPax] = useState(0);
  const [editLogTime, setEditLogTime] = useState('');
  const [detailSiteId, setDetailSiteId] = useState<string | null>(null);
  
  // Filtering states
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [logsLocationFilter, setLogsLocationFilter] = useState<string>('ALL');
  
  // Consolidating Clearance states
  const [clearanceShiftToggle, setClearanceShiftToggle] = useState<'AM' | 'PM'>(getCurrentPstMinutes() < 840 ? 'AM' : 'PM'); // 840 = 2PM
  const [clearanceSiteFilter, setClearanceSiteFilter] = useState<string>('ALL');

  const [checkinsSearch, setCheckinsSearch] = useState('');
  const [checkinsLocationFilter, setCheckinsLocationFilter] = useState<string>('ALL');
  
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const isFullAdmin = currentUser?.role === UserRole.ADMIN;
  const handleAction = async (action: () => Promise<void>) => { try { await action(); refreshData(); } catch (e: any) { console.error("Action failed:", e); } };
  const handleUpdateStation = async (userId: string, locId: string | null) => { await handleAction(() => updateUserProfile(userId, { currentLocationId: locId })); };
  
  const handleUpdateTargets = async (userId: string, val: any) => { 
    const items = Array.isArray(val) ? val : [val];
    const worksiteIds: string[] = (items as any[]).filter((v): v is string => typeof v === 'string'); 
    await handleAction(() => updateUserProfile(userId, { assignedWorksiteIds: worksiteIds })); 
  };

  const handleCsvSync = async () => {
      if (!csvUrl.trim()) return;
      setIsSyncing(true); setSyncError(''); setSyncSuccess(false);
      try {
          await syncScheduledTripsFromCSV(csvUrl.trim());
          localStorage.setItem('shuttle_csv_url', csvUrl.trim());
          setSyncSuccess(true); refreshData();
          setTimeout(() => setSyncSuccess(false), 5000);
      } catch (err: any) { setSyncError((err as any)?.message || 'Failed to sync CSV data.'); }
      finally { setIsSyncing(false); }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!locName) return;
    if (editingLocationId) { await updateLocation(editingLocationId, { name: locName, type: locType, address: locAddress }); setEditingLocationId(null); } 
    else { await addLocation(locName, locType, locAddress); }
    setLocName(''); setLocAddress(''); setLocType(LocationType.HOTEL); refreshData();
  };

  const handleUpdateTripStatus = async (tripId: string, status: string | null) => {
      let pax: number | undefined = undefined;
      if (status === 'COMPLETE') {
          const promptVal = window.prompt("Enter passenger count for manual complete:", "0");
          if (promptVal === null) return;
          pax = parseInt(promptVal, 10) || 0;
      }
      try { await updateScheduledTripStatus(tripId, status, pax); refreshData(); } catch (e: any) { alert("Failed to update status."); }
  };

  const openPermissionsModal = (user: User) => { 
    setManagingPermissionsUser(user); 
    const allowed = user.permissions.allowedLocationIds; 
    if (!allowed || !Array.isArray(allowed)) setSelectedAllowedLocationIds(new Set<string>()); 
    else setSelectedAllowedLocationIds(new Set<string>(allowed as string[])); 
  };

  const savePermissions = async () => { if (managingPermissionsUser) { const newAllowed = Array.from(selectedAllowedLocationIds).length > 0 ? Array.from(selectedAllowedLocationIds) : undefined; await updateUserAllowedLocations(managingPermissionsUser.id, newAllowed); refreshData(); setManagingPermissionsUser(null); } };
  const openEditLogModal = (log: LogEntry, e: React.MouseEvent) => { e.stopPropagation(); setEditingLog(log); setEditLogPax(log.passengerCount); const d = new Date(log.timestamp); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); setEditLogTime(d.toISOString().slice(0, 16)); };
  const saveLogEdit = async () => { if (editingLog) { await updateLog(editingLog.id, { passengerCount: editLogPax, timestamp: new Date(editLogTime).toISOString() }); setEditingLog(null); refreshData(); } };
  const formatTimeStr = (dateStr: any) => { try { return new Date(dateStr).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true}); } catch (e) { return '-'; } };
  const getLocationName = (id: string) => data.locations?.find(l => l.id === id)?.name || id || 'Unknown';
  const getUserName = (userId: string) => { const u = data.users.find(u => u.id === userId); return u ? `${u.firstName} ${u.lastName}` : 'System'; };

  // --- MEMOIZED DERIVED DATA ---
  
  const filteredTodaysLogs = useMemo(() => {
    const rawToday = (data.logs || []).filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString());
    return rawToday.filter(log => {
      const q = logsSearch.toLowerCase();
      const matchesSearch = !logsSearch || 
        log.driverName.toLowerCase().includes(q) || 
        log.companyName.toLowerCase().includes(q) || 
        log.busNumber.toLowerCase().includes(q) ||
        getLocationName(log.departLocationId).toLowerCase().includes(q) ||
        getLocationName(log.arrivalLocationId).toLowerCase().includes(q);
      const matchesStatus = logsStatusFilter === 'ALL' || log.status === logsStatusFilter;
      const matchesLocation = logsLocationFilter === 'ALL' || log.departLocationId === logsLocationFilter || log.arrivalLocationId === logsLocationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [data.logs, logsSearch, logsStatusFilter, logsLocationFilter, data.locations]);

  const activeTripsCount = useMemo(() => (data.logs || []).filter(l => l.status === TripStatus.IN_TRANSIT).length, [data.logs]);
  const completedTripsTodayCount = useMemo(() => (data.logs || []).filter(l => l.status === TripStatus.ARRIVED && new Date(l.timestamp).toDateString() === new Date().toDateString()).length, [data.logs]);
  const totalPassengersToday = useMemo(() => (data.logs || []).filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).reduce((sum, log) => sum + (log.passengerCount || 0), 0), [data.logs]);

  const clearanceData = useMemo(() => {
      const currentMins = getCurrentPstMinutes();
      const currentPstDayLower = getCurrentPstDay().toLowerCase();
      const todaySchedule = data.scheduledTrips.filter(t => t.dayOfWeek.toLowerCase() === currentPstDayLower);
      const todaysCheckIns = data.busCheckIns.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString());
      const todayLogsRaw = (data.logs || []).filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString());
      
      const worksiteIds: string[] = Array.from(new Set<string>(todaySchedule.map(t => t.arrivalLocationId)));

      const activeClearanceList = worksiteIds.filter(id => clearanceSiteFilter === 'ALL' || id === clearanceSiteFilter).map(siteId => {
          if (clearanceShiftToggle === 'AM') {
              const trips = todaySchedule.filter(t => t.arrivalLocationId === siteId && !!t.shiftStartTime);
              if (trips.length === 0) return null;
              const statuses = trips.map(t => getTripLifecycle(t, todayLogsRaw, todaysCheckIns, false, true, currentMins));
              const reachedSiteCount = statuses.filter(s => ['STAGE_2', 'TRANSIT_RET', 'COMPLETE'].includes(s.state)).length;
              return { id: siteId, name: getLocationName(siteId), total: trips.length, completed: reachedSiteCount, isClear: trips.length > 0 && reachedSiteCount === trips.length, totalPax: statuses.reduce((sum, s) => sum + s.amPax, 0) };
          } else {
              const trips = todaySchedule.filter(t => t.arrivalLocationId === siteId && !!t.pmShiftStartTime);
              if (trips.length === 0) return null;
              const statuses = trips.map(t => getTripLifecycle(t, todayLogsRaw, todaysCheckIns, false, true, currentMins));
              const returnedHotelCount = statuses.filter(s => s.state === 'COMPLETE').length;
              return { id: siteId, name: getLocationName(siteId), total: trips.length, completed: returnedHotelCount, isClear: trips.length > 0 && returnedHotelCount === trips.length, totalPax: statuses.reduce((sum, s) => sum + s.pmPax, 0) };
          }
      }).filter(Boolean).sort((a: any, b: any) => (a.isClear === b.isClear) ? 0 : a.isClear ? 1 : -1);

      return activeClearanceList;
  }, [data.scheduledTrips, data.logs, data.busCheckIns, data.locations, clearanceSiteFilter, clearanceShiftToggle]);

  const allTripsData = useMemo(() => {
      const currentPstMins = getCurrentPstMinutes();
      const activeScheduleDayLower = activeScheduleDay.toLowerCase();
      const currentPstDayLower = getCurrentPstDay().toLowerCase();
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const todayIdx = dayOrder.indexOf(currentPstDayLower);
      const filterIdx = dayOrder.indexOf(activeScheduleDayLower);
      const isToday = filterIdx === todayIdx;
      const isPastDay = filterIdx < todayIdx;

      const trips = (data.scheduledTrips || [])
          .filter(t => t.dayOfWeek.toLowerCase() === activeScheduleDayLower)
          .filter(t => {
              const depName = getLocationName(t.departLocationId).toLowerCase();
              const arrName = getLocationName(t.arrivalLocationId).toLowerCase();
              const q = scheduleSearch.toLowerCase();
              const matchesSearch = !scheduleSearch || depName.includes(q) || arrName.includes(q) || (String(t.amCrId || '').toLowerCase().includes(q)) || (String(t.pmCrId || '').toLowerCase().includes(q));
              
              const amMins = t.shiftStartTime ? getMinutesFromTimeStr(t.shiftStartTime) : null;
              const pmMins = t.pmShiftStartTime ? getMinutesFromTimeStr(t.pmShiftStartTime) : null;
              const isAMRoute = amMins !== null;
              const isPMRoute = pmMins !== null;

              const matchesShift = scheduleShiftFilter === 'ALL' || (scheduleShiftFilter === 'AM' && isAMRoute) || (scheduleShiftFilter === 'PM' && isPMRoute);
              const matchesLocation = scheduleLocationFilter === 'ALL' || t.departLocationId === scheduleLocationFilter || t.arrivalLocationId === scheduleLocationFilter;
              
              return matchesSearch && matchesShift && matchesLocation;
          })
          .sort((a, b) => (a.shiftStartTime || a.pmShiftStartTime || '').localeCompare(b.shiftStartTime || b.pmShiftStartTime || ''));
      
      const relevantLogs = data.logs.filter(l => new Date(l.timestamp).toLocaleDateString("en-US", { weekday: 'long' }).toLowerCase() === activeScheduleDayLower);
      const relevantCheckIns = data.busCheckIns.filter(c => new Date(c.timestamp).toLocaleDateString("en-US", { weekday: 'long' }).toLowerCase() === activeScheduleDayLower);

      return { trips, currentPstMins, isToday, isPastDay, relevantLogs, relevantCheckIns };
  }, [data.scheduledTrips, activeScheduleDay, scheduleSearch, scheduleShiftFilter, scheduleLocationFilter, data.logs, data.busCheckIns, data.locations]);

  const filteredCheckins = useMemo(() => {
    return (data.busCheckIns || []).filter(c => {
      const q = checkinsSearch.toLowerCase();
      const matchesSearch = !checkinsSearch || 
        c.busNumber.toLowerCase().includes(q) || 
        c.driverName.toLowerCase().includes(q) || 
        c.companyName.toLowerCase().includes(q) || 
        getLocationName(c.locationId).toLowerCase().includes(q);
      const matchesLocation = checkinsLocationFilter === 'ALL' || c.locationId === checkinsLocationFilter;
      return matchesSearch && matchesLocation;
    });
  }, [data.busCheckIns, checkinsSearch, checkinsLocationFilter, data.locations]);

  const filteredUsers = useMemo(() => {
    return (data.users || []).filter(u => {
      const q = usersSearch.toLowerCase();
      const matchesSearch = !usersSearch || 
        u.firstName.toLowerCase().includes(q) || 
        u.lastName.toLowerCase().includes(q) || 
        u.phone.includes(q);
      const matchesRole = usersRoleFilter === 'ALL' || u.role === usersRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [data.users, usersSearch, usersRoleFilter]);

  const detailedSite = useMemo(() => {
      if (!detailSiteId) return null;
      const site = data.locations.find(l => l.id === detailSiteId);
      if (!site) return null;

      const currentMins = getCurrentPstMinutes();
      const currentPstDayLower = getCurrentPstDay().toLowerCase();
      const todaySchedule = data.scheduledTrips.filter(t => t.dayOfWeek.toLowerCase() === currentPstDayLower);
      const todaysCheckIns = data.busCheckIns.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString());
      const todayLogsRaw = (data.logs || []).filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString());

      const siteTrips = todaySchedule.filter(t => t.arrivalLocationId === detailSiteId);
      const items = siteTrips.map(trip => ({
          trip,
          lifecycle: getTripLifecycle(trip, todayLogsRaw, todaysCheckIns, false, true, currentMins)
      }));

      return { site, items };
  }, [detailSiteId, data.locations, data.scheduledTrips, data.busCheckIns, data.logs]);

  const locationOptionsForFilter = useMemo(() => {
    return [
        { id: 'ALL', name: 'All Locations' },
        ...data.locations.filter(l => l.isActive).sort((a,b) => a.name.localeCompare(b.name))
    ];
  }, [data.locations]);

  const renderOverview = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Logs Today</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{filteredTodaysLogs.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-blue-500 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1">In Transit</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{activeTripsCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-green-500 dark:text-green-400 text-[10px] font-black uppercase tracking-wider mb-1">Arrived</div>
            <div className="text-2xl font-black text-green-600 dark:text-green-400">{completedTripsTodayCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Pax Today</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalPassengersToday}</div>
          </div>
        </div>

        {/* TOP: LIVE TRIP LOGS */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100"><ClipboardList size={18} /> Live Trip Logs</h3>
            <div className="flex flex-wrap items-center gap-2">
               <div className="w-full md:w-48">
                 <SearchableDropdown options={locationOptionsForFilter} value={logsLocationFilter} onChange={setLogsLocationFilter} placeholder="Filter Location" compact />
               </div>
               <div className="relative flex-1 md:flex-none">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                 <input type="text" placeholder="Search logs..." value={logsSearch} onChange={e => setLogsSearch(e.target.value)} className="pl-9 pr-4 py-2 border dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-700 w-full md:w-48 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                 {(['ALL', TripStatus.IN_TRANSIT, TripStatus.ARRIVED] as const).map(s => (
                   <button key={s} onClick={() => setLogsStatusFilter(s)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${logsStatusFilter === s ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>{s.replace('_', ' ')}</button>
                 ))}
               </div>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[950px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-black uppercase text-[10px] sticky top-0 z-10 border-b dark:border-slate-700">
                  <tr>
                    <th className="p-4">Status</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Route / Comments</th>
                    <th className="p-4">Transport / Logged By</th>
                    <th className="p-4 text-center">Pax</th>
                    <th className="p-4">Timing</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                    {filteredTodaysLogs.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">No matching logs found.</td></tr> : filteredTodaysLogs.slice(0, 100).map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border inline-flex items-center gap-1 ${log.status === TripStatus.IN_TRANSIT ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                {log.status === TripStatus.IN_TRANSIT ? <Clock size={10}/> : <CheckCircle2 size={10}/>}
                                {log.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">{formatTimeStr(log.timestamp)}</td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <span className="truncate max-w-[120px]">{getLocationName(log.departLocationId)}</span>
                                  <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                                  <span className="truncate max-w-[120px]">{getLocationName(log.arrivalLocationId)}</span>
                                </div>
                                {log.notes && (
                                  <div className="flex items-start gap-1.5 mt-1 text-[10px] text-yellow-700 dark:text-yellow-400 font-medium italic bg-yellow-50/50 dark:bg-yellow-900/10 px-1.5 py-0.5 rounded border border-yellow-100/50 dark:border-yellow-900/30">
                                    <MessageSquare size={10} className="flex-shrink-0 mt-0.5" /><span className="truncate max-w-[200px]">{log.notes}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{log.companyName} • <span className="text-blue-600 dark:text-blue-400">#{log.busNumber}</span></div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                                  <UserIcon size={10} className="flex-shrink-0" /><span className="truncate">Driver: {log.driverName}</span><span className="mx-1">•</span><span className="truncate">By: {getUserName(log.userId)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center"><div className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-black text-slate-800 dark:text-slate-100">{log.passengerCount}</div></td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                 {log.actualArrivalTime ? (
                                   <div className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> ARR {formatTimeStr(log.actualArrivalTime)}</div>
                                 ) : log.eta ? (
                                   <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> ETA {log.eta}</div>
                                 ) : <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">In Transit</span>}
                               </div>
                            </td>
                            <td className="p-4 text-right"><button onClick={(e) => openEditLogModal(log, e)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"><Edit2 size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM: CONSOLIDATED WORKSITE CLEARANCE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-widest flex items-center gap-2">
                        <Siren size={18} className="text-red-500" /> 
                        Worksite Clearance Tracking
                    </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full md:w-60">
                        <SearchableDropdown 
                            options={locationOptionsForFilter.filter(o => o.id === 'ALL' || data.locations.find(l => l.id === o.id)?.type === LocationType.WORKSITE)} 
                            value={clearanceSiteFilter} 
                            onChange={setClearanceSiteFilter} 
                            placeholder="Filter Worksite" 
                            compact 
                        />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        {(['AM', 'PM'] as const).map(s => (
                            <button 
                                key={s} 
                                onClick={() => setClearanceShiftToggle(s)} 
                                className={`px-5 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${clearanceShiftToggle === s ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                {s === 'AM' ? <Sun size={12}/> : <Moon size={12}/>}
                                {s} SHIFT
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {clearanceData.map((site: any) => (
                    <button key={site.id} onClick={() => setDetailSiteId(site.id)} className={`text-left p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${site.isClear ? 'bg-green-50/20 border-green-100 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 hover:shadow-lg'}`}>
                        {site.isClear && <div className="absolute top-0 right-0 p-2 text-green-500"><CheckCircle2 size={16} /></div>}
                        <div className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase leading-tight mb-3 pr-4 group-hover:text-blue-600 transition-colors">{site.name}</div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-tighter">
                                <span className="text-slate-400">Complete</span>
                                <span className={site.isClear ? 'text-green-600' : 'text-blue-600'}>{site.completed} / {site.total}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-out ${site.isClear ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${(site.completed / Math.max(site.total, 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-700/50">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Total Pax</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{site.totalPax}</span>
                            </div>
                            {site.isClear && <span className="text-[9px] font-black text-green-600 uppercase border border-green-100 px-1.5 py-0.5 rounded">Clear</span>}
                        </div>
                    </button>
                ))}
                {clearanceData.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 italic text-sm">
                        No matching {clearanceShiftToggle} routes scheduled today.
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  const renderAllTrips = () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const { trips, currentPstMins, isToday, isPastDay, relevantLogs, relevantCheckIns } = allTripsData;
      return (
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full">
                      <h3 className="font-bold flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-100"><RefreshCw size={18} /> Master Schedule Sync</h3>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Paste Google Sheet CSV URL" value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} className="flex-1 px-4 py-2.5 border dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        <button onClick={handleCsvSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2">{isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sync</button>
                      </div>
                  </div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {days.map(day => (
                    <button key={day} onClick={() => setActiveScheduleDay(day)} className={`px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${activeScheduleDay === day ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>{day.toUpperCase()}</button>
                ))}
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h4 className="font-black uppercase text-xs tracking-widest flex items-center gap-2 text-slate-800 dark:text-slate-100"><Calendar size={18} /> Daily Schedule: {activeScheduleDay}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-48">
                            <SearchableDropdown options={locationOptionsForFilter} value={scheduleLocationFilter} onChange={setScheduleLocationFilter} placeholder="Filter Location" compact />
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                          {(['ALL', 'AM', 'PM'] as const).map(s => (
                            <button key={s} onClick={() => setScheduleShiftFilter(s)} className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${scheduleShiftFilter === s ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>{s}</button>
                          ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                            <input type="text" placeholder="Quick search..." value={scheduleSearch} onChange={e => setScheduleSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-700 outline-none focus:ring-1 focus:ring-blue-500 min-w-[180px]" />
                        </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-black uppercase text-[10px] border-b dark:border-slate-700">
                              <tr>
                                  <th className="p-4 w-8"></th>
                                  <th className="p-4 w-28">Status</th>
                                  <th className="p-4">Route Full Leg (Hotel ⇄ Worksite)</th>
                                  <th className="p-4 w-32 text-right">Shift Start(s)</th>
                                  <th className="p-4 w-24 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-700">
                              {trips.length === 0 ? <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic bg-slate-50/50">No matching scheduled trips found.</td></tr> : trips.map(trip => {
                                  const isRowExpanded = expandedTripId === trip.id;
                                  const lifecycle = getTripLifecycle(trip, relevantLogs, relevantCheckIns, isPastDay, isToday, currentPstMins);
                                  const depLoc = data.locations.find(l => l.id === trip.departLocationId);
                                  const arrLoc = data.locations.find(l => l.id === trip.arrivalLocationId);
                                  return (
                                  <React.Fragment key={trip.id}>
                                      <tr onClick={() => setExpandedTripId(isRowExpanded ? null : trip.id)} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 ${isRowExpanded ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                          <td className="p-4 text-slate-400">{isRowExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                                          <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm ${lifecycle.color}`}>{lifecycle.label}</span></td>
                                          <td className="p-4">
                                              <div className="flex flex-col gap-1">
                                                  <div className="font-black text-slate-900 dark:text-white uppercase leading-tight text-xs tracking-tight">{depLoc?.name}</div>
                                                  <div className="flex items-center gap-3"><div className="w-4 h-px bg-slate-300 dark:bg-slate-600"></div><span className="font-black text-slate-500 dark:text-slate-400 uppercase leading-tight text-[11px] tracking-tight">{arrLoc?.name}</span></div>
                                              </div>
                                          </td>
                                          <td className="p-4 text-right font-mono font-black text-sm">
                                              <div className="flex flex-col items-end gap-1">
                                                  {trip.shiftStartTime && (
                                                      <span className="text-blue-600">
                                                          {parseTimeDisplay(trip.shiftStartTime).includes('AM') || parseTimeDisplay(trip.shiftStartTime).includes('PM') 
                                                            ? parseTimeDisplay(trip.shiftStartTime) 
                                                            : `AM ${parseTimeDisplay(trip.shiftStartTime)}`}
                                                      </span>
                                                  )}
                                                  {trip.pmShiftStartTime && (
                                                      <span className="text-indigo-600">
                                                          {parseTimeDisplay(trip.pmShiftStartTime).includes('AM') || parseTimeDisplay(trip.pmShiftStartTime).includes('PM') 
                                                            ? parseTimeDisplay(trip.pmShiftStartTime) 
                                                            : `PM ${parseTimeDisplay(trip.pmShiftStartTime)}`}
                                                      </span>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="p-4 text-right">
                                              <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                  {isFullAdmin && (
                                                      <select onChange={e => handleUpdateTripStatus(trip.id, e.target.value === 'AUTO' ? null : e.target.value)} className="text-[10px] font-black border rounded px-1.5 py-0.5 bg-white dark:bg-slate-700" value={trip.manualStatus || 'AUTO'}><option value="AUTO">AUTO</option><option value="COMPLETE">DONE</option><option value="CANCELLED">X</option></select>
                                                  )}
                                                  {trip.amCrId && <a href="#" className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition shadow-sm flex items-center gap-0.5" title={`AM CR ID: ${trip.amCrId}`}><ExternalLink size={12}/><span className="text-[8px] font-black">AM</span></a>}
                                                  {trip.pmCrId && <a href="#" className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition shadow-sm flex items-center gap-0.5" title={`PM CR ID: ${trip.pmCrId}`}><ExternalLink size={12}/><span className="text-[8px] font-black">PM</span></a>}
                                              </div>
                                          </td>
                                      </tr>
                                      {isRowExpanded && (
                                          <tr className="bg-slate-50/30 dark:bg-slate-800/30 animate-fadeIn"><td colSpan={5} className="p-0 border-b dark:border-slate-700"><div className="p-8 space-y-10"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="flex items-start gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.01]"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><Building size={24} /></div><div className="min-w-0"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hotel Point</div><div className="font-black text-sm text-slate-800 dark:text-white uppercase truncate">{depLoc?.name}</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-1.5 leading-relaxed italic"><MapPin size={12} className="flex-shrink-0 mt-0.5" /> {depLoc?.address || 'No physical address provided.'}</div></div></div><div className="flex items-start gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.01]"><div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl"><Map size={24} /></div><div className="min-w-0"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Worksite Point</div><div className="font-black text-sm text-slate-800 dark:text-white uppercase truncate">{arrLoc?.name}</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-1.5 leading-relaxed italic"><MapPin size={12} className="flex-shrink-0 mt-0.5" /> {arrLoc?.address || 'No physical address provided.'}</div></div></div></div><div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border dark:border-slate-700 shadow-lg relative overflow-hidden group"><div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-20"></div><div className="absolute top-[3.75rem] left-[10%] right-[10%] h-[2px] bg-slate-100 dark:bg-slate-700 z-0"></div><div className="flex items-center justify-between relative z-10 px-2"><TimelinePoint label="Bus Arr" time={trip.busArrivalAtHotel} currentMins={currentPstMins} /><TimelinePoint label="Boarding" time={trip.boardingBeginsAtHotel} currentMins={currentPstMins} /><TimelinePoint label="Outbound" time={trip.hotelDepartureTime} currentMins={currentPstMins} /><TimelinePoint label="Arr Site" time={trip.busArrivalAtWorksite} currentMins={currentPstMins} /><TimelinePoint label="Staging" time={trip.busStageTimeAtWorksite} currentMins={currentPstMins} /><TimelinePoint label="Return" time={trip.worksiteDepartureTime} currentMins={currentPstMins} /><TimelinePoint label="Arr Hotel" time={trip.busArrivalAtHotelReturn} currentMins={currentPstMins} /></div></div><div className="flex gap-4 px-2">{trip.amCrId && (<div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800"><span className="text-[10px] font-black text-blue-600 uppercase">AM CR: {trip.amCrId}</span><a href="#" className="text-blue-600 hover:text-blue-800"><ExternalLink size={12}/></a></div>)}{trip.pmCrId && (<div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800"><span className="text-[10px] font-black text-indigo-600 uppercase">PM CR: {trip.pmCrId}</span><a href="#" className="text-indigo-600 hover:text-indigo-800"><ExternalLink size={12}/></a></div>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{lifecycle.logs.am ? (<div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md">OUT</div><div><div className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider">Outbound Trip Recorded</div><div className="text-sm text-blue-800 dark:text-blue-200 font-black mt-0.5">{lifecycle.logs.am.companyName} • {lifecycle.amPax} PAX</div></div></div><button onClick={(e) => openEditLogModal(lifecycle.logs.am!, e)} className="p-2.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors"><Edit2 size={18}/></button></div>) : <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-black text-[10px] uppercase flex items-center justify-center gap-3 tracking-widest"><AlertCircle size={14}/> Outbound Not Logged</div>}{lifecycle.logs.pm ? (<div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md">RET</div><div><div className="text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300 tracking-wider">Return Trip Recorded</div><div className="text-sm text-indigo-800 dark:text-blue-200 font-black mt-0.5">{lifecycle.logs.pm.companyName} • {lifecycle.pmPax} PAX</div></div></div><button onClick={(e) => openEditLogModal(lifecycle.logs.pm!, e)} className="p-2.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors"><Edit2 size={18}/></button></div>) : <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-black text-[10px] uppercase flex items-center justify-center gap-3 tracking-widest"><AlertCircle size={14}/> Return Not Logged</div>}</div></div></td></tr>
                                      )}
                                  </React.Fragment>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <ErrorBoundary>
      <div className="md:p-4 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 flex overflow-x-auto no-scrollbar">
            {[{ id: 'overview', label: 'Dashboard', icon: BarChart3 }, { id: 'all-trips', label: 'Schedule', icon: Map }, { id: 'checkins', label: 'Arrivals', icon: ArrowDownCircle }, { id: 'users', label: 'Team', icon: Users }, { id: 'locations', label: 'Locs', icon: MapPin }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[100px] py-4 text-[11px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 border-b-2 transition ${activeTab === tab.id ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/20' : 'border-transparent text-slate-400 hover:bg-slate-50'}`}>
                <tab.icon size={20} /> {tab.label}
              </button>
            ))}
        </div>
        <div className="animate-fadeIn">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'all-trips' && renderAllTrips()}
          {activeTab === 'checkins' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100"><ArrowDownCircle size={18} /> Bus Arrival History</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="w-48">
                            <SearchableDropdown options={locationOptionsForFilter} value={checkinsLocationFilter} onChange={setCheckinsLocationFilter} placeholder="Filter Location" compact />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input type="text" placeholder="Search arrivals..." value={checkinsSearch} onChange={e => setCheckinsSearch(e.target.value)} className="pl-9 pr-4 py-2 border dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-700 w-full md:w-64 outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold uppercase text-[10px]"><tr><th className="p-4">Time</th><th className="p-4">Loc</th><th className="p-4">Details</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y dark:divide-slate-700">{filteredCheckins.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No matching arrivals found.</td></tr> : filteredCheckins.map(c => (<tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30"><td className="p-4 font-mono font-bold">{formatTimeStr(c.timestamp)}</td><td className="p-4 font-bold">{getLocationName(c.locationId)}</td><td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">{c.companyName} • Bus {c.busNumber}</td><td className="p-4 text-right"><button onClick={() => handleAction(() => deleteBusCheckIn(c.id))} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
              </div>
          )}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                   <Users className="text-blue-600" size={20} />
                   <h3 className="font-bold text-slate-800 dark:text-slate-100">Team Management</h3>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                      {(['ALL', UserRole.ADMIN, UserRole.AGENT] as const).map(r => (
                        <button key={r} onClick={() => setUsersRoleFilter(r)} className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${usersRoleFilter === r ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>{r}</button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input type="text" placeholder="Search team..." value={usersSearch} onChange={e => setUsersSearch(e.target.value)} className="pl-9 pr-4 py-2 border dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-700 w-full md:w-64 outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                 </div>
              </div>
              <UserTable users={filteredUsers.filter(u => u.status !== UserStatus.REVOKED)} title="Active Team" data={data} refreshData={refreshData} onUpdateStation={handleUpdateStation} onUpdateTargets={handleUpdateTargets} onOpenPermissions={openPermissionsModal} onAction={handleAction} />
              <UserTable users={filteredUsers.filter(u => u.status === UserStatus.REVOKED)} title="Revoked Access" isRevoked={true} data={data} refreshData={refreshData} onUpdateStation={handleUpdateStation} onUpdateTargets={handleUpdateTargets} onOpenPermissions={openPermissionsModal} onAction={handleAction} />
            </div>
          )}
          {activeTab === 'locations' && (
              <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"><h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100"><Plus size={18}/> Add Location</h3><form onSubmit={handleLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"><div><label className="text-xs font-bold text-slate-500 mb-1 block">Name</label><input type="text" value={locName} onChange={e => setLocName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600" placeholder="Name" required /></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">Address</label><input type="text" value={locAddress} onChange={e => setLocAddress(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600" placeholder="Address" /></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">Type</label><select value={locType} onChange={e => setLocType(e.target.value as LocationType)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600"><option value={LocationType.HOTEL}>Hotel</option><option value={LocationType.WORKSITE}>Worksite</option></select></div><button type="submit" className="bg-blue-600 text-white font-bold py-2.5 rounded-xl">Save</button></form></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{data.locations.map(loc => (<div key={loc.id} className="p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 flex justify-between items-center transition-all hover:border-blue-300"><div><div className="font-black text-slate-800 dark:text-slate-100 uppercase text-sm tracking-tight">{loc.name}</div><div className="text-[10px] text-slate-500 italic mt-1">{loc.address || 'No address set'}</div></div><div className="flex gap-2"><button onClick={() => toggleLocation(loc.id)} className={`p-2 rounded-lg transition ${loc.isActive ? 'text-green-600 bg-green-50' : 'text-slate-300 bg-slate-50'}`}><CheckCircle size={18}/></button></div></div>))}</div>
              </div>
          )}
        </div>
      </div>

      {detailedSite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[90vh] flex flex-col animate-slideInUp overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 rounded-t-3xl"><div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-1">{detailedSite.site.name}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Completion Breakdown</p></div><button onClick={() => setDetailSiteId(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                {detailedSite.items.length === 0 ? (<div className="py-20 text-center text-slate-400 italic">No scheduled trips assigned to this worksite today.</div>) : detailedSite.items.map(({ trip, lifecycle }) => (
                    <div key={trip.id} className={`p-4 rounded-2xl border transition-all ${lifecycle.state === 'COMPLETE' ? 'bg-green-50/30 border-green-100 dark:border-green-900/30' : lifecycle.state === 'UNCONFIRMED' ? 'bg-amber-50/30 border-amber-100 border-dashed dark:border-amber-900/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-widest ${lifecycle.color}`}>{lifecycle.label}</span><span className="text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono">{parseTimeDisplay(trip.shiftStartTime || trip.pmShiftStartTime)}</span></div>
                            <div className="flex flex-col items-end gap-1">
                                {trip.amCrId && (<a href="#" className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-blue-500 uppercase">AM CR: {trip.amCrId} <ExternalLink size={10}/></a>)}
                                {trip.pmCrId && (<a href="#" className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-indigo-500 uppercase">PM CR: {trip.pmCrId} <ExternalLink size={10}/></a>)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between"><div className="min-w-0"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Departure Hotel</div><div className="font-black text-xs text-slate-800 dark:text-slate-100 truncate uppercase">{getLocationName(trip.departLocationId)}</div></div><div className="text-right"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div><div className="font-black text-xs text-slate-800 dark:text-slate-100">{lifecycle.totalPax} PAX</div></div></div>
                    </div>
                ))}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-3xl"><button onClick={() => setDetailSiteId(null)} className="w-full bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.98] uppercase tracking-widest text-sm">Close Breakdown</button></div>
          </div>
        </div>
      )}

      {managingPermissionsUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn flex flex-col max-h-[85vh]"><div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-black text-sm uppercase tracking-widest">Access Control: {managingPermissionsUser.firstName}</h3><button onClick={() => setManagingPermissionsUser(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button></div><div className="p-4 overflow-y-auto flex-1 space-y-1">{data.locations.filter(l => l.isActive).map(loc => { const isSelected = selectedAllowedLocationIds.has(loc.id); return (<button key={loc.id} onClick={() => { const next = new Set(selectedAllowedLocationIds); if (next.has(loc.id)) next.delete(loc.id); else next.add(loc.id); setSelectedAllowedLocationIds(next); }} className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center justify-between transition ${isSelected ? 'bg-blue-600 text-white font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>{loc.name} {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}</button>); })}</div><div className="p-5 border-t"><button onClick={savePermissions} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.98]">Save Access Settings</button></div></div>
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-sm w-full animate-fadeIn border dark:border-slate-700"><h3 className="font-black text-lg mb-6 uppercase tracking-tight">Modify Log Entry</h3><div className="space-y-5"><div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Passengers (Pax)</label><input type="number" className="w-full border dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition" value={editLogPax} onChange={e => setEditLogPax(parseInt(e.target.value))} /></div><div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Departure Time</label><input type="datetime-local" className="w-full border dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition" value={editLogTime} onChange={e => setEditLogTime(e.target.value)} /></div></div><div className="flex gap-4 mt-8"><button onClick={() => setEditingLog(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-slate-200">Cancel</button><button onClick={saveLogEdit} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg transition hover:bg-blue-700">Update</button></div></div>
        </div>
      )}
    </ErrorBoundary>
  );
};