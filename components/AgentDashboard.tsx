import React, { useState, useEffect } from 'react';
import { AppData, User, RouteType, LocationType, LogEntry, TripStatus, UserRole, BusCheckIn } from '../types';
import { createLog, markTripArrived, createBusCheckIn, updateUserLocation, updateUserAssignedWorksite, updateBusCheckIn } from '../services/supabaseService';
import { SearchableDropdown } from './SearchableDropdown';
import { ArrowRightLeft, Bus, Clock, Users, Building, MapPin, CheckCircle2, AlertCircle, History, User as UserIcon, ArrowDownCircle, FileText, ChevronDown, ChevronUp, Briefcase, Settings2, X, Loader2, Edit2, Save } from 'lucide-react';

interface AgentDashboardProps {
  data: AppData;
  currentUser: User;
  refreshData: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ data, currentUser, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'DEPARTURE' | 'CHECK_IN'>('DEPARTURE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile Config State
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Trip State
  const [routeType, setRouteType] = useState<RouteType>(RouteType.HOTEL_TO_SITE);
  const [departId, setDepartId] = useState('');
  const [arriveId, setArriveId] = useState('');
  const [driver, setDriver] = useState('');
  const [company, setCompany] = useState('');
  const [busNo, setBusNo] = useState('');
  const [passengers, setPassengers] = useState('');
  const [eta, setEta] = useState('');
  const [notes, setNotes] = useState('');
  
  // Check-in State
  const [checkInLocId, setCheckInLocId] = useState('');

  // Check-in Edit State
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [editingCheckInTime, setEditingCheckInTime] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  
  // UI State for expanding notes
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const isAgent = currentUser.role === UserRole.AGENT;

  // Auto-fill logic when route type or locations change
  useEffect(() => {
    // If not manually set, try to default based on current profile settings
    if (activeTab === 'DEPARTURE') {
        if (routeType === RouteType.HOTEL_TO_SITE) {
            if (currentUser.currentLocationId) setDepartId(currentUser.currentLocationId);
            if (currentUser.assignedWorksiteId) setArriveId(currentUser.assignedWorksiteId);
        } else {
            if (currentUser.assignedWorksiteId) setDepartId(currentUser.assignedWorksiteId);
            if (currentUser.currentLocationId) setArriveId(currentUser.currentLocationId);
        }
    }
  }, [routeType, currentUser.currentLocationId, currentUser.assignedWorksiteId, activeTab]);

  // Helpers
  const getUserName = (userId: string) => {
    const u = data.users.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : 'Unknown Agent';
  };

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown';

  const toggleNote = (id: string) => {
    const next = new Set(expandedNotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNotes(next);
  };

  // Active trips logic - Filtered
  const activeTrips = data.logs
    .filter(l => l.status === TripStatus.IN_TRANSIT)
    .filter(l => !isAgent || l.userId === currentUser.id) // Agents see own, Admins see all
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // History logic - Filtered
  const historyLogs = data.logs
    .filter(l => l.status === TripStatus.ARRIVED)
    .filter(l => !isAgent || l.userId === currentUser.id) // Agents see own, Admins see all
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Check-ins History logic
  const recentCheckIns = (data.busCheckIns || [])
    .filter(l => !isAgent || l.userId === currentUser.id)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Filter locations based on PERMISSIONS and STATUS
  const allowedIds = currentUser.permissions.allowedLocationIds;
  const activeLocations = data.locations.filter(l => {
      // Must be active in system
      if (!l.isActive) return false;
      // If allowedIds is undefined or null, allow all. If it's an array, allow only included.
      if (!allowedIds || allowedIds.length === 0) return true;
      return allowedIds.includes(l.id);
  });

  const hotelLocs = activeLocations.filter(l => l.type === LocationType.HOTEL);
  const siteLocs = activeLocations.filter(l => l.type === LocationType.WORKSITE);

  const departOptions = routeType === RouteType.HOTEL_TO_SITE ? hotelLocs : siteLocs;
  const arriveOptions = routeType === RouteType.HOTEL_TO_SITE ? siteLocs : hotelLocs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departId || !arriveId || !driver || !company || !busNo || !passengers) return;
    
    setIsSubmitting(true);
    await createLog({
      userId: currentUser.id,
      routeType,
      departLocationId: departId,
      arrivalLocationId: arriveId,
      driverName: driver,
      companyName: company,
      busNumber: busNo,
      passengerCount: parseInt(passengers),
      eta,
      notes: notes.trim()
    });

    setSuccessMsg('Departure logged! Trip is now In-Transit.');
    refreshData();
    setIsSubmitting(false);
    resetForm();
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInLocId || !driver || !company || !busNo) return;

    setIsSubmitting(true);
    await createBusCheckIn({
      userId: currentUser.id,
      locationId: checkInLocId,
      driverName: driver,
      companyName: company,
      busNumber: busNo
    });

    setSuccessMsg('Bus Arrival Confirmed!');
    refreshData();
    setIsSubmitting(false);
    resetForm();
  };

  const resetForm = () => {
    setBusNo('');
    setPassengers('');
    setEta('');
    setDriver('');
    setCompany('');
    setNotes('');
    setCheckInLocId('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleArrive = async (id: string) => {
    await markTripArrived(id);
    refreshData();
  };

  const handleLocationChange = async (val: string) => {
    await updateUserLocation(currentUser.id, val);
    refreshData();
  };

  const handleWorksiteChange = async (val: string) => {
    await updateUserAssignedWorksite(currentUser.id, val);
    refreshData();
  };

  const startEditCheckIn = (checkIn: BusCheckIn) => {
      setEditingCheckInId(checkIn.id);
      const d = new Date(checkIn.timestamp);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setEditingCheckInTime(d.toISOString().slice(0, 16));
  };

  const saveCheckInTime = async () => {
      if(editingCheckInId && editingCheckInTime) {
          const newTime = new Date(editingCheckInTime).toISOString();
          await updateBusCheckIn(editingCheckInId, newTime);
          setEditingCheckInId(null);
          refreshData();
      }
  };

  return (
    <div className="md:p-4 max-w-7xl mx-auto space-y-4 md:space-y-6">

      {/* --- DESKTOP HEADER --- */}
      <div className="hidden md:grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <MapPin size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">My Station</h3>
                <p className="text-xs text-slate-500">Your current physical location (Hotel).</p>
              </div>
            </div>
            <div className="w-60">
              <SearchableDropdown 
                options={activeLocations} 
                value={currentUser.currentLocationId || ''} 
                onChange={handleLocationChange} 
                placeholder="Select Location..."
                compact={true}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Briefcase size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Assigned Worksite</h3>
                <p className="text-xs text-slate-500">The destination hospital you are managing.</p>
              </div>
            </div>
            <div className="w-60">
              <SearchableDropdown 
                options={siteLocs} 
                value={currentUser.assignedWorksiteId || ''} 
                onChange={handleWorksiteChange} 
                placeholder="Select Worksite..."
                compact={true}
              />
            </div>
          </div>
      </div>

      {/* --- MOBILE HEADER (Compact Context Bar) --- */}
      <div className="md:hidden bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="px-4 py-3 flex items-center justify-between" onClick={() => setIsConfigOpen(!isConfigOpen)}>
            <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-1"><MapPin size={10} /> Station</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1"><Briefcase size={10} /> Target</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 truncate">
                    <span className="truncate max-w-[45%]">{currentUser.currentLocationId ? getLocationName(currentUser.currentLocationId) : 'Select Station'}</span>
                    <span className="text-slate-400">→</span>
                    <span className="truncate max-w-[45%]">{currentUser.assignedWorksiteId ? getLocationName(currentUser.assignedWorksiteId) : 'Select Worksite'}</span>
                </div>
            </div>
            <button className="p-2 bg-slate-100 rounded-full text-slate-600">
                {isConfigOpen ? <ChevronUp size={18}/> : <Settings2 size={18}/>}
            </button>
        </div>
        
        {/* Mobile Config Dropdown */}
        {isConfigOpen && (
            <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 space-y-4 shadow-inner">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">My Physical Location (Hotel)</label>
                    <SearchableDropdown 
                        options={activeLocations} 
                        value={currentUser.currentLocationId || ''} 
                        onChange={handleLocationChange} 
                        placeholder="Select Location..."
                        compact={true}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Assigned Worksite (Hospital)</label>
                    <SearchableDropdown 
                        options={siteLocs} 
                        value={currentUser.assignedWorksiteId || ''} 
                        onChange={handleWorksiteChange} 
                        placeholder="Select Worksite..."
                        compact={true}
                    />
                </div>
                <button 
                    onClick={() => setIsConfigOpen(false)}
                    className="w-full py-2 bg-blue-100 text-blue-700 font-medium rounded-lg text-sm"
                >
                    Done
                </button>
            </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-0">
        {/* LEFT COLUMN: Log Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            
            {/* Action Tabs */}
            <div className="flex border-b border-slate-100">
                  <button 
                    onClick={() => setActiveTab('DEPARTURE')}
                    className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${activeTab === 'DEPARTURE' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    <ArrowRightLeft size={16} /> Trip Departure
                  </button>
                  <button 
                    onClick={() => setActiveTab('CHECK_IN')}
                    className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${activeTab === 'CHECK_IN' ? 'border-orange-600 text-orange-700 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    <ArrowDownCircle size={16} /> Bus Check-in
                  </button>
            </div>

            <div className="p-4 md:p-6">
              {activeTab === 'DEPARTURE' ? (
                <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
                  
                  {/* Route Toggle - Bigger on Mobile */}
                  <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setRouteType(RouteType.HOTEL_TO_SITE)}
                        className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition flex flex-col md:flex-row items-center justify-center gap-1 ${routeType === RouteType.HOTEL_TO_SITE ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                    >
                        <span>Hotel</span> <span className="text-slate-300">→</span> <span>Site</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRouteType(RouteType.SITE_TO_HOTEL)}
                        className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition flex flex-col md:flex-row items-center justify-center gap-1 ${routeType === RouteType.SITE_TO_HOTEL ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                    >
                         <span>Site</span> <span className="text-slate-300">→</span> <span>Hotel</span>
                    </button>
                  </div>

                  {/* Location Selects */}
                  <div className="space-y-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block pl-1">Departure</label>
                        <SearchableDropdown 
                            options={departOptions} 
                            value={departId} 
                            onChange={setDepartId} 
                            placeholder="Select Departure"
                            icon={<MapPin size={16} />}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block pl-1">Arrival</label>
                        <SearchableDropdown 
                            options={arriveOptions} 
                            value={arriveId} 
                            onChange={setArriveId} 
                            placeholder="Select Arrival"
                            icon={<MapPin size={16} />}
                        />
                    </div>
                  </div>

                  {/* Trip Details - Mobile Optimized Layout */}
                  <div className="space-y-4">
                      {/* Driver & Company Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Driver Name</label>
                            <input 
                            type="text" 
                            value={driver} 
                            onChange={e => setDriver(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-base shadow-sm"
                            placeholder="Driver Name"
                            required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Company</label>
                            <input 
                            type="text" 
                            value={company} 
                            onChange={e => setCompany(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-base shadow-sm"
                            placeholder="Company"
                            required
                            />
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1 truncate">Bus #</label>
                            <input 
                            type="text" 
                            inputMode="numeric"
                            value={busNo} 
                            onChange={e => setBusNo(e.target.value)}
                            className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-center font-medium text-base shadow-sm"
                            placeholder="#"
                            required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1 truncate">Pax</label>
                            <input 
                            type="number" 
                            inputMode="numeric"
                            value={passengers} 
                            onChange={e => setPassengers(e.target.value)}
                            className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-center font-medium text-base shadow-sm"
                            placeholder="0"
                            required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1 truncate">ETA</label>
                            <input 
                            type="time" 
                            value={eta} 
                            onChange={e => setEta(e.target.value)}
                            className="w-full px-1 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-center text-sm shadow-sm"
                            />
                        </div>
                      </div>
                  </div>

                  <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Notes</label>
                     <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 text-base shadow-sm"
                        placeholder="Optional details..."
                        rows={2}
                     />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-700/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <><span>Log Departure</span><Bus size={20} /></>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCheckInSubmit} className="space-y-6 animate-fadeIn">
                  <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-sm text-orange-800 flex items-start gap-2">
                      <ArrowDownCircle className="flex-shrink-0 mt-0.5" size={16} />
                      <p>Log a bus arrival at a hotel to mark availability.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Location</label>
                    <SearchableDropdown 
                        options={hotelLocs} 
                        value={checkInLocId} 
                        onChange={setCheckInLocId} 
                        placeholder="Select Hotel"
                        icon={<Building size={18} />}
                    />
                  </div>

                  <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Company</label>
                            <input 
                                type="text" 
                                value={company} 
                                onChange={e => setCompany(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 text-base"
                                placeholder="e.g. CharterCo"
                                required
                            />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Driver</label>
                            <input 
                                type="text" 
                                value={driver} 
                                onChange={e => setDriver(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 text-base"
                                placeholder="Name"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Bus #</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={busNo} 
                                onChange={e => setBusNo(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 text-base"
                                placeholder="#"
                                required
                            />
                        </div>
                      </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <><span>Confirm Check-in</span><CheckCircle2 size={20} /></>
                    )}
                  </button>
                </form>
              )}

              {successMsg && (
                <div className="bg-green-100 text-green-800 p-3 rounded-lg text-center font-medium animate-pulse border border-green-200 mt-4">
                  {successMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Trips / Check-in History */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Trips Section */}
          {activeTab === 'DEPARTURE' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  In-Transit Buses
                </h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{activeTrips.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
                {activeTrips.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Bus size={40} className="mb-2 opacity-20" />
                    <p>No buses currently in transit.</p>
                  </div>
                )}
                
                {activeTrips.map(log => (
                  <div key={log.id} className="bg-white border border-slate-200 p-3 md:p-4 rounded-xl shadow-sm relative overflow-hidden">
                    {/* Status Stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    
                    <div className="pl-3">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                {log.routeType === RouteType.HOTEL_TO_SITE ? 'Hotel → Site' : 'Site → Hotel'}
                                <span className="text-slate-300">|</span>
                                <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </div>
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-100">
                                Bus {log.busNumber}
                            </span>
                        </div>

                        <div className="mb-3">
                             <div className="flex items-center gap-2 text-slate-900 font-bold text-sm leading-tight">
                                <span className="truncate w-[45%]">{getLocationName(log.departLocationId)}</span>
                                <span className="text-slate-300">➝</span>
                                <span className="truncate w-[45%]">{getLocationName(log.arrivalLocationId)}</span>
                             </div>
                             <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span>{log.companyName}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{log.driverName}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="font-semibold text-slate-700">{log.passengerCount} Pax</span>
                             </div>
                        </div>

                        {log.notes && (
                        <div className="mb-3">
                            <button 
                                onClick={() => toggleNote(log.id)}
                                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline focus:outline-none"
                            >
                                {expandedNotes.has(log.id) ? 'Hide Notes' : 'Show Notes'}
                            </button>
                            {expandedNotes.has(log.id) && (
                                <div className="mt-2 text-xs text-slate-600 bg-yellow-50 border border-yellow-100 p-2 rounded">
                                    {log.notes}
                                </div>
                            )}
                        </div>
                        )}

                        <button 
                            onClick={() => handleArrive(log.id)}
                            className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-sm font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Mark Arrived
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Recent Check-ins List (Visible when in Check-in Mode) */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-orange-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-orange-900 flex items-center gap-2">
                    <History size={18} />
                    Recent Bus Check-ins
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentCheckIns.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <ArrowDownCircle size={40} className="mb-2 opacity-20" />
                      <p>No recent check-ins recorded.</p>
                    </div>
                )}
                {recentCheckIns.map(checkIn => (
                  <div key={checkIn.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{getLocationName(checkIn.locationId)}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">Bus {checkIn.busNumber}</span>
                            <span>{checkIn.companyName}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <UserIcon size={10} /> Driver: {checkIn.driverName}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        {editingCheckInId === checkIn.id ? (
                            <div className="flex flex-col items-end gap-1">
                                <input 
                                    type="datetime-local" 
                                    className="border rounded p-1 text-xs" 
                                    value={editingCheckInTime}
                                    onChange={(e) => setEditingCheckInTime(e.target.value)}
                                />
                                <button onClick={saveCheckInTime} className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                    <Save size={12} /> Save
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="font-bold text-slate-800 flex items-center justify-end gap-1 group cursor-pointer" onClick={() => startEditCheckIn(checkIn)}>
                                    {new Date(checkIn.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-blue-500" />
                                </div>
                                <div className="text-xs text-slate-400">{new Date(checkIn.timestamp).toLocaleDateString()}</div>
                            </>
                        )}
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Section (Only visible in Departure Mode) */}
          {activeTab === 'DEPARTURE' && (currentUser.permissions.canViewHistory ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hidden md:block">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <History size={18} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">Recent Arrivals</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {historyLogs.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">No recent history.</div>}
                {historyLogs.map(log => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 transition flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-slate-700">{getLocationName(log.departLocationId)} → {getLocationName(log.arrivalLocationId)}</div>
                      <div className="text-slate-400 text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span title="Arrival Time">Arr: {log.actualArrivalTime ? new Date(log.actualArrivalTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                        <span title="Departure Time" className={!isAgent ? 'text-slate-500' : 'hidden md:inline'}>Dep: {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <span>Bus {log.busNumber}</span>
                        {!isAgent && (
                          <span className="text-blue-600 bg-blue-50 px-1 rounded flex items-center gap-1">
                              <UserIcon size={10} /> {getUserName(log.userId)}
                          </span>
                        )}
                        {log.notes && (
                            <span className="text-yellow-600 bg-yellow-50 px-1.5 rounded flex items-center gap-0.5 cursor-help" title={log.notes}>
                                <FileText size={10} /> Notes
                            </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hidden md:block">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-slate-800 font-medium">History Hidden</h3>
              <p className="text-slate-500 text-sm mt-1">You do not have permission to view past logs.</p>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};
