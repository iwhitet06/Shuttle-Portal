import React, { useState, useEffect } from 'react';
import { AppData, User, RouteType, LocationType, LogEntry, TripStatus, UserRole, BusCheckIn } from '../types';
import { createLog, markTripArrived, createBusCheckIn, updateUserLocation, updateUserAssignedWorksite, updateBusCheckIn } from '../services/supabaseService';
import { SearchableDropdown } from './SearchableDropdown';
import { ArrowRightLeft, Bus, Clock, Users, Building, MapPin, CheckCircle2, AlertCircle, History, User as UserIcon, ArrowDownCircle, FileText, ChevronDown, ChevronUp, Briefcase, Settings2, X, Loader2, Edit2, Save, Eye } from 'lucide-react';

// Drive Time Lookup Table (Hotel Name | Worksite Name -> Duration H:MM)
const ROUTE_DURATIONS: Record<string, string> = {
  "Courtyard by Marriott Los Angeles Hacienda Heights/Orange County|Downey MC": "0:50",
  "SpringHill Suites by Marriott Valencia|Panorama City MC": "0:50",
  "Hampton Inn Los Angeles/Santa Clarita|Panorama City MC": "0:45",
  "Courtyard by Marriott Los Angeles Monterey Park|Downey MC": "0:35",
  "W Hollywood|Panorama City MC": "0:25",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|LAMC Mental Health Center": "0:25",
  "Courtyard by Marriott Los Angeles Sherman Oaks|Panorama City MC": "0:24",
  "Newport Beach Marriott Bayview|Irvine MC": "0:20",
  "Sheraton Universal Hotel|Panorama City MC": "0:20",
  "Hampton Inn by Hilton North Hollywood|Panorama City MC": "0:20",
  "Sheraton Gateway Los Angeles Hotel|Carson Medical Office": "0:24",
  "Courtyard by Marriott Ventura Simi Valley|Porter Ranch MOB Family Medicine": "0:22",
  "DoubleTree by Hilton Hotel Ontario Airport|Ontario Medical Center MOB A & D": "0:20",
  "Courtyard by Marriott Bakersfield|Stockdale Urgent Care": "0:18",
  "Courtyard by Marriott Long Beach Airport|Irvine MC": "0:50",
  "Los Angeles Airport Marriott|West LA MC": "0:45",
  "Marina Del Rey Marriott|West LA MC": "0:35",
  "Hilton Garden Inn Dana Point Doheny Beach|Irvine MC": "0:26",
  "Hotel Indigo Los Angeles Downtown, an IHG Hotel|West LA MC": "0:20",
  "The Westin LAX|West LA MC": "0:20",
  "Courtyard by Marriott Thousand Oaks Agoura Hills|Woodland Hills MC": "0:20",
  "Sheraton Agoura Hills Hotel|Woodland Hills MC": "0:18",
  "Irvine Marriott|Irvine MC": "0:16",
  "AC Hotel Beverly Hills|West LA MC": "0:14",
  "Sheraton Gateway Los Angeles Hotel|Normandie North Medical Offices": "0:35",
  "Hilton Garden Inn Dana Point Doheny Beach|MVJ Medical Office": "0:22",
  "San Diego Marriott Mission Valley|San Diego Medical Center": "0:16",
  "Courtyard by Marriott Bakersfield|Chester I MOB": "0:12",
  "Sonesta ES Suites Carmel Mountain San Diego|ZION MEDICAL CENTER": "0:30",
  "Holiday Inn Carlsbad - San Diego, an IHG Hotel|SAN MARCOS MEDICAL CENTER": "0:24",
  "Staybridge Suites Carlsbad - San Diego, an IHG Hotel|SAN MARCOS MEDICAL CENTER": "0:24",
  "Carte Hotel San Diego Downtown, Curio Collection by Hilton|Zion Medical Center": "0:22",
  "Courtyard by Marriott San Diego Downtown Little Italy|Zion Medical Center": "0:22",
  "Crowne Plaza San Diego - Mission Valley by IHG|Zion Medical Center": "0:20",
  "SpringHill Suites by Marriott San Diego Escondido/Downtown|SAN MARCOS MEDICAL CENTER": "0:20",
  "Hampton Inn San Diego/Mission Valley|Zion Medical Center": "0:18",
  "TownePlace Suites by Marriott San Diego Carlsbad/Vista|SAN MARCOS MEDICAL CENTER": "0:18",
  "San Diego Marriott Mission Valley|ZION MEDICAL CENTER": "0:16",
  "The Viv Hotel, Anaheim, a Tribute Portfolio Hotel|HBM Medical Office": "0:35",
  "The Westin South Coast Plaza, Costa Mesa|Downey MC - Orchard MOB": "0:35",
  "Courtyard by Marriott Irvine John Wayne Airport/Orange County|HBM Medical Office": "0:18",
  "Le Méridien Pasadena Arcadia|FPL Med Office": "0:16",
  "Le Méridien Pasadena Arcadia|LAMC": "0:40",
  "Homewood Suites by Hilton San Bernardino|Fontana Medical Center": "0:35",
  "Hotel Indigo Los Angeles Downtown, an IHG Hotel|Los Angeles Medical Center": "0:30",
  "Candlewood Suites Loma Linda - San Bernardino S by IHG|Fontana Medical Center": "0:30",
  "Holiday Inn Express & Suites Loma Linda- San Bernardino S by IHG|Fontana Medical Center": "0:30",
  "Four Points by Sheraton Ontario-Rancho Cucamonga|FMC MOB 1& 2, MOB 3": "0:28",
  "InterContinental Los Angeles Downtown by IHG|Los Angeles Medical Center": "0:28",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|Los Angeles Medical Center": "0:28",
  "DoubleTree by Hilton Hotel San Bernardino|Fontana Medical Center": "0:26",
  "TownePlace Suites by Marriott San Bernardino Loma Linda|Fontana Medical Center": "0:26",
  "Hotel Indigo Los Angeles Downtown, an IHG Hotel|LAMC": "0:24",
  "Courtyard San Bernardino Loma Linda|Fontana Medical Center": "0:20",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|KP-4700 Sunset": "0:26",
  "Courtyard by Marriott Thousand Oaks Ventura County|Market Street MOB": "0:26",
  "Warner Center Marriott Woodland Hills|Woodland Hills MC": "0:06",
  "Courtyard by Marriott Chino Hills|Riverside Medical Center MOB": "0:45",
  "Courtyard by Marriott Chino Hills|Riverside MC": "0:45",
  "Hampton Inn & Suites Moreno Valley|Riverside MC": "0:40",
  "TownePlace Suites by Marriott Ontario Chino Hills|Riverside MC": "0:40",
  "Fairfield by Marriott Inn & Suites San Bernardino|Riverside MC": "0:35",
  "Residence Inn by Marriott San Bernardino|Riverside MC": "0:35",
  "Courtyard by Marriott Los Angeles Hacienda Heights/Orange County|Baldwin Park MC": "0:30",
  "Courtyard by Marriott Riverside UCR/Moreno Valley Area|Riverside MC": "0:28",
  "Fairfield by Marriott Inn & Suites Riverside Corona/Norco|Riverside MC": "0:25",
  "SpringHill Suites by Marriott Corona Riverside|Riverside MC": "0:18",
  "DoubleTree by Hilton Hotel San Diego - Mission Valley|OTM Medical Office": "0:30",
  "Courtyard by Marriott San Diego Downtown|OTM Medical Office": "0:28",
  "SpringHill Suites by Marriott Los Angeles Downey|Downey MC- Garden MOB": "0:12",
  "Sheraton Gateway Los Angeles Hotel|South Bay MC": "0:30",
  "Courtyard by Marriott San Diego Carlsbad|San Marcos Medical Center": "0:28",
  "DoubleTree by Hilton Hotel Ontario Airport|Ontario Medical Center": "0:22",
  "Fairfield by Marriott Inn & Suites San Diego Carlsbad|San Marcos Medical Center": "0:28",
  "Residence Inn by Marriott Ontario Rancho Cucamonga|Ontario Medical Center": "0:28",
  "Residence Inn by Marriott Los Angeles Torrance/Redondo Beach|South Bay MC": "0:24",
  "Courtyard by Marriott Bakersfield|Stockdale": "0:15",
  "Sheraton Gateway Los Angeles Hotel|Coastline Medical Office Building": "0:30",
  "Delta Hotels Anaheim Garden Grove|Kraemer Medical Office 2": "0:30",
  "SpringHill Suites by Marriott Los Angeles Downey|Downey MC - Orchard MOB": "0:09",
  "SLS Hotel, a Luxury Collection Hotel, Beverly Hills|Baldwin Hills Crenshaw Med Office": "0:30",
  "SLS Hotel, a Luxury Collection Hotel, Beverly Hills|Baldwin Park MC": "0:45",
  "Delta Hotels Anaheim Garden Grove|Anaheim MC": "0:30",
  "Hilton Anaheim|Anaheim MC": "0:28",
  "Anaheim Suites|Anaheim MC": "0:26",
  "JW Marriott, Anaheim Resort|Anaheim MC": "0:26",
  "Residence Inn by Marriott Pasadena Arcadia|Baldwin Park MC": "0:24",
  "DoubleTree by Hilton Hotel Los Angeles - Rosemead|Baldwin Park MC": "0:20",
  "Fairfield Inn Anaheim Hills Orange County|Anaheim MC": "0:18",
  "Sheraton Los Angeles San Gabriel|Baldwin Park MC": "0:14",
  "Courtyard by Marriott Los Angeles Baldwin Park|Baldwin Park MC": "0:14",
  "Courtyard by Marriott Los Angeles Monterey Park|Downey MC": "0:40",
  "The Westin LAX|West LA MC": "0:40",
  "Le Méridien Pasadena Arcadia|Center of Healthy Living": "0:28",
  "The Westin South Coast Plaza, Costa Mesa|Pharmacy Central Order": "0:45",
  "Fullerton Marriott at California State University|Ontario Medical Center": "0:35",
  "Residence Inn by Marriott Santa Clarita Valencia|Panorama City-Main Campus (MO2, MO3, MO4, MO5, MO6)": "0:35",
  "TownePlace Suites by Marriott Ontario Airport|Ontario Medical Center": "0:28",
  "Home2 Suites by Hilton San Bernardino|VMC Clinical": "0:26",
  "Courtyard San Bernardino Loma Linda|VMC Clinical": "0:26",
  "Residence Inn by Marriott San Bernardino|VMC Clinical": "0:24",
  "DoubleTree by Hilton Los Angeles – Norwalk|Pharmacy Central Order": "0:24",
  "Delta Hotels Ontario Airport|Ontario Medical Center": "0:22",
  "Holiday Inn la Mirada – Buena Park by IHG|Bellflower MOB": "0:26",
  "SpringHill Suites by Marriott San Diego Escondido/Downtown|San Marcos MOB": "0:20",
  "DoubleTree by Hilton Hotel San Diego - Mission Valley|Vandever MOB": "0:16",
  "Residence Inn by Marriott Palmdale Lancaster|LAN Mob": "0:14",
  "The Westin South Coast Plaza, Costa Mesa|Pharmacy Mail Order Pharm and Tech": "0:45",
  "Sonesta ES Suites San Diego - Sorrento Mesa|San Diego Medical Center": "0:26",
  "DoubleTree by Hilton Hotel San Diego - Mission Valley|San Diego Medical Center": "0:16",
  "Courtyard by Marriott Costa Mesa South Coast Metro|EMO Medical Office": "0:35",
  "The Westin South Coast Plaza, Costa Mesa|Downey MC": "0:50",
  "DoubleTree by Hilton Whittier Los Angeles|Downey MC": "0:35",
  "Residence Inn by Marriott Cypress Los Alamitos|Downey MC": "0:35",
  "Holiday Inn la Mirada – Buena Park by IHG|Downey MC": "0:26",
  "Sheraton Cerritos Hotel|Downey MC": "0:22",
  "Sheraton Cerritos Hotel|Bellflower MOB": "0:20",
  "Courtyard by Marriott San Diego Mission Valley/Hotel Circle|San Diego Medical Center": "0:16",
  "Crowne Plaza San Diego - Mission Valley by IHG|San Diego Medical Center": "0:16",
  "SpringHill Suites by Marriott Los Angeles Downey|Downey MC": "0:10",
  "Courtyard by Marriott Costa Mesa South Coast Metro|GG Medical Office": "0:28",
  "Courtyard by Marriott Victorville Hesperia|High Desert MOB": "0:18",
  "Sonesta ES Suites San Diego - Rancho Bernardo|ZION MEDICAL CENTER": "0:35",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|KP-4900 Sunset": "0:35",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|Regional L&D Advice Nurse": "0:28",
  "Hotel Indigo Los Angeles Downtown, an IHG Hotel|KP-4700 Sunset": "0:24",
  "Courtyard by Marriott San Diego Downtown|ZION MEDICAL CENTER": "0:24",
  "Courtyard by Marriott Los Angeles Pasadena/Old Town|KP-4950 Sunset": "0:25",
  "DoubleTree by Hilton Hotel San Diego - Mission Valley|ZION MEDICAL CENTER": "0:16",
  "Embassy Suites by Hilton Temecula Valley Wine Country|Murrieta Medical Office Building": "0:24",
  "Residence Inn by Marriott Los Angeles Torrance/Redondo Beach|Normandie North Medical Offices": "0:24",
  "Residence Inn by Marriott Santa Clarita Valencia|Santa Clarita MOB 2": "0:12"
};

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

  // Local State for Dropdowns (Optimistic UI)
  const [localLocationId, setLocalLocationId] = useState(currentUser.currentLocationId || '');
  const [localWorksiteIds, setLocalWorksiteIds] = useState<string[]>(currentUser.assignedWorksiteIds || []);
  
  // Track if we have successfully synced initial data from server to prevent overwriting user edits
  const [hasLoadedWorksites, setHasLoadedWorksites] = useState(false);

  // Sync local state when currentUser updates from backend (e.g. initial load)
  useEffect(() => {
    // Always sync location if it changes externally and we aren't editing it (simplified: just sync if different)
    if (currentUser.currentLocationId && currentUser.currentLocationId !== localLocationId) {
        setLocalLocationId(currentUser.currentLocationId);
    }

    const serverIds = currentUser.assignedWorksiteIds || [];
    
    // Logic to prevent "fighting" between optimistic local state and stale polling data:
    // Only sync from server if we haven't loaded yet, OR if the server provides data and we have none.
    // Once loaded, we trust local state until a hard refresh.
    if (!hasLoadedWorksites) {
        if (serverIds.length > 0) {
            setLocalWorksiteIds(serverIds);
            setHasLoadedWorksites(true);
        } else if (localWorksiteIds.length === 0) {
            // Both empty, technically loaded, but we wait for potential data
            // If user has NO assignments, this might prevent setting hasLoadedWorksites to true immediately,
            // but that's fine, next interaction will set local state.
        }
    }
  }, [currentUser.currentLocationId, currentUser.assignedWorksiteIds, hasLoadedWorksites]);

  // Trip State
  const [routeType, setRouteType] = useState<RouteType>(RouteType.HOTEL_TO_SITE);
  const [departId, setDepartId] = useState('');
  const [arriveId, setArriveId] = useState('');
  const [driver, setDriver] = useState('');
  const [company, setCompany] = useState('');
  const [busNo, setBusNo] = useState('');
  const [passengers, setPassengers] = useState('');
  // const [eta, setEta] = useState(''); // ETA hidden per request, now auto-calculated
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
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Auto-fill logic when route type or locations change
  useEffect(() => {
    // If not manually set, try to default based on current profile settings
    if (activeTab === 'DEPARTURE') {
        // Use first assigned worksite as default target if available
        const defaultWorksite = localWorksiteIds.length > 0 ? localWorksiteIds[0] : '';
        
        if (routeType === RouteType.HOTEL_TO_SITE) {
            if (localLocationId) setDepartId(localLocationId);
            if (defaultWorksite) setArriveId(defaultWorksite);
        } else {
            if (defaultWorksite) setDepartId(defaultWorksite);
            if (localLocationId) setArriveId(localLocationId);
        }
    }
  }, [routeType, localLocationId, localWorksiteIds, activeTab]);

  // Auto-fill Check-in location based on Station
  useEffect(() => {
      if (activeTab === 'CHECK_IN' && localLocationId && !checkInLocId) {
          setCheckInLocId(localLocationId);
      }
  }, [activeTab, localLocationId]);

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

  // Visibility Logic for Active Trips & History
  const isLogVisible = (l: LogEntry) => {
      // 1. Admins see everything
      if (isAdmin) return true;
      // 2. Owners see their own
      if (l.userId === currentUser.id) return true;
      
      // 3. Agents see logs that involve their currently SELECTED worksites (localWorksiteIds)
      //    A log involves a worksite if the departure OR arrival is in the selected set.
      if (localWorksiteIds.length > 0) {
          if (localWorksiteIds.includes(l.departLocationId) || localWorksiteIds.includes(l.arrivalLocationId)) {
              return true;
          }
      }
      return false;
  };

  // Active trips logic - Filtered
  const activeTrips = data.logs
    .filter(l => l.status === TripStatus.IN_TRANSIT)
    .filter(isLogVisible)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // History logic - Filtered
  const historyLogs = data.logs
    .filter(l => l.status === TripStatus.ARRIVED)
    .filter(isLogVisible)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Check-ins History logic (Filtered to TODAY)
  const recentCheckIns = (data.busCheckIns || [])
    .filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString())
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
    
    // Auto Calculate ETA
    let autoEta = '';
    const departLoc = data.locations.find(l => l.id === departId);
    const arriveLoc = data.locations.find(l => l.id === arriveId);
    
    if (departLoc && arriveLoc) {
        // Determine Hotel and Worksite for lookup (order agnostic in theory, but map is Hotel|Worksite)
        const hotel = departLoc.type === LocationType.HOTEL ? departLoc : arriveLoc;
        const worksite = departLoc.type === LocationType.WORKSITE ? departLoc : arriveLoc;
        
        if (hotel.type === LocationType.HOTEL && worksite.type === LocationType.WORKSITE) {
             const key = `${hotel.name}|${worksite.name}`;
             const duration = ROUTE_DURATIONS[key];
             if (duration) {
                 const [h, m] = duration.split(':').map(Number);
                 const now = new Date();
                 now.setMinutes(now.getMinutes() + (h * 60) + m);
                 // Format as HH:mm (24h) for backend storage compatibility
                 autoEta = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
             }
        }
    }

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
      eta: autoEta,
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
    // setEta('');
    setDriver('');
    setCompany('');
    setNotes('');
    // Do not reset checkInLocId if it was auto-filled from station
    if (activeTab === 'DEPARTURE') {
        // Only clear location selects if we want to force re-selection, 
        // but keeping them sticky is usually better UX.
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleArrive = async (id: string) => {
    await markTripArrived(id);
    refreshData();
  };

  const handleLocationChange = async (val: string) => {
    setLocalLocationId(val); // Optimistic update
    await updateUserLocation(currentUser.id, val);
    // Removed refreshData() to avoid race condition with polling
  };

  const handleWorksiteChange = async (val: any) => {
    // If multi-select is enabled (admin), val is string[]. Otherwise string.
    let newIds: string[] = [];
    if (Array.isArray(val)) {
        newIds = val;
    } else {
        newIds = [val];
    }
    
    setLocalWorksiteIds(newIds); // Optimistic update
    setHasLoadedWorksites(true); // Mark as loaded so polling doesn't overwrite
    await updateUserAssignedWorksite(currentUser.id, newIds);
    // Removed refreshData() to avoid race condition with polling.
    // The background poller in App.tsx will pick up changes eventually.
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
      
      {/* CSS Animation for Breathing Glow */}
      <style>{`
        @keyframes breathing-border {
          0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); border-color: rgba(59, 130, 246, 0.8); }
          100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
        }
        .breathing-card {
          animation: breathing-border 3s ease-in-out infinite;
        }
      `}</style>

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
                value={localLocationId} 
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
                <h3 className="font-bold text-slate-800 text-sm">Assigned Worksite{isAdmin ? 's' : ''}</h3>
                <p className="text-xs text-slate-500">The destination hospital(s) you are managing.</p>
              </div>
            </div>
            <div className="w-60">
              <SearchableDropdown 
                options={siteLocs} 
                value={isAdmin ? localWorksiteIds : (localWorksiteIds[0] || '')} 
                onChange={handleWorksiteChange} 
                placeholder={isAdmin ? "Select Worksites..." : "Select Worksite..."}
                compact={true}
                multiple={isAdmin}
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
                    <span className="truncate max-w-[45%]">{localLocationId ? getLocationName(localLocationId) : 'Select Station'}</span>
                    <span className="text-slate-400">→</span>
                    <span className="truncate max-w-[45%]">
                        {localWorksiteIds.length > 0 
                            ? (localWorksiteIds.length > 1 
                                ? `${localWorksiteIds.length} Sites` 
                                : getLocationName(localWorksiteIds[0]))
                            : 'Select Worksite'}
                    </span>
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
                        value={localLocationId} 
                        onChange={handleLocationChange} 
                        placeholder="Select Location..."
                        compact={true}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Assigned Worksite(s) (Hospital)</label>
                    <SearchableDropdown 
                        options={siteLocs} 
                        value={isAdmin ? localWorksiteIds : (localWorksiteIds[0] || '')} 
                        onChange={handleWorksiteChange} 
                        placeholder="Select Worksite..."
                        compact={true}
                        multiple={isAdmin}
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

                      {/* Stats Row - ETA Removed */}
                      <div className="grid grid-cols-2 gap-3">
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
                
                {activeTrips.map(log => {
                  const isOwner = log.userId === currentUser.id;
                  // Allow actions only for owner or admin
                  const canAction = isAdmin || isOwner;

                  return (
                  <div key={log.id} className={`bg-white border border-slate-200 p-3 md:p-4 rounded-xl shadow-sm relative overflow-hidden transition-all duration-300 ${isOwner ? 'breathing-card bg-blue-50/40' : ''}`}>
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
                             {!isOwner && (
                                 <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                     <UserIcon size={10} /> Logged by: {getUserName(log.userId)}
                                 </div>
                             )}
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

                        {canAction ? (
                            <button 
                                onClick={() => handleArrive(log.id)}
                                className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-sm font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Mark Arrived
                            </button>
                        ) : (
                            <div className="w-full bg-slate-50 text-slate-400 border border-slate-200 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                                <Eye size={14} /> Tracking Only
                            </div>
                        )}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ) : (
            /* Recent Check-ins List (Visible when in Check-in Mode) */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-orange-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-orange-900 flex items-center gap-2">
                    <History size={18} />
                    Recent Bus Check-ins (Today)
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentCheckIns.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <ArrowDownCircle size={40} className="mb-2 opacity-20" />
                      <p>No recent check-ins recorded today.</p>
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