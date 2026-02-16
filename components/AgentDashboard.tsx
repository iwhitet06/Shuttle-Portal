import React, { useState, useEffect } from 'react';
import { AppData, User, RouteType, LocationType, LogEntry, TripStatus, UserRole, BusCheckIn } from '../types';
import { createLog, markTripArrived, createBusCheckIn, updateBusCheckIn } from '../services/supabaseService';
import { SearchableDropdown } from './SearchableDropdown';
import { ArrowRightLeft, Bus, Clock, Users, Building, MapPin, CheckCircle2, AlertCircle, History, User as UserIcon, ArrowDownCircle, FileText, ChevronDown, ChevronUp, Briefcase, Settings2, X, Loader2, Edit2, Save, Eye } from 'lucide-react';

// Drive Time Lookup Table (Kept for feature parity)
const ROUTE_DURATIONS: Record<string, string> = {
  "Courtyard by Marriott Los Angeles Hacienda Heights/Orange County|Downey MC": "0:50",
  "SpringHill Suites by Marriott Valencia|Panorama City MC": "0:50",
  "Hampton Inn Los Angeles/Santa Clarita|Panorama City MC": "0:45",
  "Courtyard by Marriott Los Angeles Monterey Park|Downey MC": "0:40",
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
  "The Westin LAX|West LA MC": "0:40",
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
  onUpdateProfile: (updates: { currentLocationId?: string, assignedWorksiteIds?: string[] }) => Promise<void>;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ data, currentUser, refreshData, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'DEPARTURE' | 'CHECK_IN'>('DEPARTURE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile Config State
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Trip Form State
  const [routeType, setRouteType] = useState<RouteType>(RouteType.HOTEL_TO_SITE);
  const [departId, setDepartId] = useState('');
  const [arriveId, setArriveId] = useState('');
  const [driver, setDriver] = useState('');
  const [company, setCompany] = useState('');
  const [busNo, setBusNo] = useState('');
  const [passengers, setPassengers] = useState('');
  const [notes, setNotes] = useState('');
  
  // Check-in Form State
  const [checkInLocId, setCheckInLocId] = useState('');

  // Check-in Edit State
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [editingCheckInTime, setEditingCheckInTime] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown';
  const getUserName = (userId: string) => {
    const u = data.users.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : 'Unknown Agent';
  };

  const allowedIds = currentUser.permissions.allowedLocationIds;
  const activeLocations = data.locations.filter(l => l.isActive && (!allowedIds || allowedIds.length === 0 || allowedIds.includes(l.id)));
  const siteLocs = activeLocations.filter(l => l.type === LocationType.WORKSITE);
  const hotelLocs = activeLocations.filter(l => l.type === LocationType.HOTEL);

  // Auto-fill trip form whenever profile settings (station/targets) or route type changes
  useEffect(() => {
    if (activeTab === 'DEPARTURE') {
        const worksiteIds = currentUser.assignedWorksiteIds || [];
        const defaultWorksiteId = worksiteIds.length > 0 ? worksiteIds[0] : '';
        const stationId = currentUser.currentLocationId || '';
        const station = data.locations.find(l => l.id === stationId);
        
        if (routeType === RouteType.HOTEL_TO_SITE) {
            // If I'm at a hotel, I'm the Departure. If I'm at a site, I'm the Arrival.
            if (station?.type === LocationType.HOTEL) setDepartId(stationId);
            else if (station?.type === LocationType.WORKSITE) setArriveId(stationId);

            // Fill the target side if applicable
            if (defaultWorksiteId) setArriveId(defaultWorksiteId);
        } else {
            // SITE_TO_HOTEL
            if (station?.type === LocationType.WORKSITE) setDepartId(stationId);
            else if (station?.type === LocationType.HOTEL) setArriveId(stationId);

            if (defaultWorksiteId) setDepartId(defaultWorksiteId);
        }
    }
    // Auto-fill Check-in location with station if it's a hotel
    if (activeTab === 'CHECK_IN' && currentUser.currentLocationId) {
        const station = data.locations.find(l => l.id === currentUser.currentLocationId);
        if (station?.type === LocationType.HOTEL) {
            setCheckInLocId(currentUser.currentLocationId);
        }
    }
  }, [routeType, currentUser.currentLocationId, currentUser.assignedWorksiteIds, activeTab, data.locations]);

  const toggleNote = (id: string) => {
    const next = new Set(expandedNotes);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedNotes(next);
  };

  const isLogVisible = (l: LogEntry) => {
      if (isAdmin) return true;
      if (l.userId === currentUser.id) return true;
      const myWorksiteIds = currentUser.assignedWorksiteIds || [];
      if (myWorksiteIds.includes(l.departLocationId) || myWorksiteIds.includes(l.arrivalLocationId)) return true;
      return false;
  };

  const activeTrips = data.logs.filter(l => l.status === TripStatus.IN_TRANSIT).filter(isLogVisible).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const historyLogs = data.logs.filter(l => l.status === TripStatus.ARRIVED).filter(isLogVisible).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentCheckIns = (data.busCheckIns || []).filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).filter(l => !isAdmin || l.userId === currentUser.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  const departOptions = routeType === RouteType.HOTEL_TO_SITE ? hotelLocs : siteLocs;
  const arriveOptions = routeType === RouteType.HOTEL_TO_SITE ? siteLocs : hotelLocs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departId || !arriveId || !driver || !company || !busNo || !passengers) return;
    
    let autoEta = '';
    const departLoc = data.locations.find(l => l.id === departId);
    const arriveLoc = data.locations.find(l => l.id === arriveId);
    if (departLoc && arriveLoc) {
        const hotel = departLoc.type === LocationType.HOTEL ? departLoc : arriveLoc;
        const worksite = departLoc.type === LocationType.WORKSITE ? departLoc : arriveLoc;
        if (hotel.type === LocationType.HOTEL && worksite.type === LocationType.WORKSITE) {
             const key = `${hotel.name}|${worksite.name}`;
             const duration = ROUTE_DURATIONS[key];
             if (duration) {
                 const [h, m] = duration.split(':').map(Number);
                 const now = new Date();
                 now.setMinutes(now.getMinutes() + (h * 60) + m);
                 autoEta = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
             }
        }
    }

    setIsSubmitting(true);
    try {
        await createLog({ userId: currentUser.id, routeType, departLocationId: departId, arrivalLocationId: arriveId, driverName: driver, companyName: company, busNumber: busNo, passengerCount: parseInt(passengers), eta: autoEta, notes: notes.trim() });
        setSuccessMsg('Departure logged!');
        refreshData(); 
        resetForm();
    } catch (err) {
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInLocId || !driver || !company || !busNo) return;
    setIsSubmitting(true);
    try {
        await createBusCheckIn({ userId: currentUser.id, locationId: checkInLocId, driverName: driver, companyName: company, busNumber: busNo });
        setSuccessMsg('Arrival Confirmed!');
        refreshData(); 
        resetForm();
    } catch (err) {
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetForm = () => { 
      setBusNo(''); 
      setPassengers(''); 
      setDriver(''); 
      setCompany(''); 
      setNotes(''); 
      setTimeout(() => setSuccessMsg(''), 3000); 
  };
  
  const handleArrive = async (id: string) => { await markTripArrived(id); refreshData(); };

  const saveCheckInTime = async () => {
    if (editingCheckInId) {
      try {
        await updateBusCheckIn(editingCheckInId, new Date(editingCheckInTime).toISOString());
        setEditingCheckInId(null);
        refreshData();
      } catch (err) {
        console.error("Failed to update check-in time:", err);
      }
    }
  };

  // Immediate Profile Updates
  const handleStationChange = (val: string) => {
    onUpdateProfile({ currentLocationId: val });
  };

  const handleTargetsChange = (val: any) => {
    const newIds = Array.isArray(val) ? val : [val];
    onUpdateProfile({ assignedWorksiteIds: newIds });
  };

  return (
    <div className="md:p-4 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <style>{`
        @keyframes breathing-border {
          0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); border-color: rgba(59, 130, 246, 0.8); }
          100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
        }
        .breathing-card { animation: breathing-border 3s ease-in-out infinite; }
        .dark .breathing-card { animation: none; border-color: #3b82f6; }
      `}</style>

      {/* Profile Bar - Station & Targets (Persists Immediately) */}
      <div className="hidden md:grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full"><MapPin size={20} className="text-blue-600 dark:text-blue-400" /></div>
              <div><h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">My Station</h3><p className="text-xs text-slate-500 dark:text-slate-400">Your current physical location.</p></div>
            </div>
            <div className="w-60">
                <SearchableDropdown 
                    options={activeLocations} 
                    value={currentUser.currentLocationId || ''} 
                    onChange={handleStationChange} 
                    placeholder="Select Station" 
                    compact={true} 
                />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full"><Briefcase size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
              <div><h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Assigned Targets</h3><p className="text-xs text-slate-500 dark:text-slate-400">Target worksites you are managing.</p></div>
            </div>
            <div className="w-60">
                <SearchableDropdown 
                    options={siteLocs} 
                    value={isAdmin ? (currentUser.assignedWorksiteIds || []) : (currentUser.assignedWorksiteIds?.[0] || '')} 
                    onChange={handleTargetsChange} 
                    placeholder="Select Target" 
                    compact={true} 
                    multiple={isAdmin} 
                />
            </div>
          </div>
      </div>

      {/* Mobile Context Bar (Persists Immediately) */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-16 z-30">
        <div className="px-4 py-3 flex items-center justify-between" onClick={() => setIsConfigOpen(!isConfigOpen)}>
            <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><MapPin size={8} /> Station</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1"><Briefcase size={8} /> Target</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    <span className="truncate max-w-[45%]">{currentUser.currentLocationId ? getLocationName(currentUser.currentLocationId) : 'Select'}</span>
                    <span className="text-slate-400">→</span>
                    <span className="truncate max-w-[45%]">{currentUser.assignedWorksiteIds && currentUser.assignedWorksiteIds.length > 0 ? (currentUser.assignedWorksiteIds.length > 1 ? `${currentUser.assignedWorksiteIds.length} Sites` : getLocationName(currentUser.assignedWorksiteIds[0])) : 'Select'}</span>
                </div>
            </div>
            <button className="p-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{isConfigOpen ? <ChevronUp size={16}/> : <Settings2 size={16}/>}</button>
        </div>
        {isConfigOpen && (
            <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 space-y-4 shadow-inner">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">My Station</label><SearchableDropdown options={activeLocations} value={currentUser.currentLocationId || ''} onChange={handleStationChange} placeholder="Select Location" compact={true} /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Target(s)</label><SearchableDropdown options={siteLocs} value={isAdmin ? (currentUser.assignedWorksiteIds || []) : (currentUser.assignedWorksiteIds?.[0] || '')} onChange={handleTargetsChange} placeholder="Select Worksite" compact={true} multiple={isAdmin} /></div>
                <button onClick={() => setIsConfigOpen(false)} className="w-full py-2 font-medium rounded-lg text-sm flex items-center justify-center gap-2 bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={16} /> Done
                </button>
            </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-0">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-slate-700">
                  <button onClick={() => setActiveTab('DEPARTURE')} className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${activeTab === 'DEPARTURE' ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><ArrowRightLeft size={16} /> Trip Departure</button>
                  <button onClick={() => setActiveTab('CHECK_IN')} className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${activeTab === 'CHECK_IN' ? 'border-orange-600 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><ArrowDownCircle size={16} /> Bus Check-in</button>
            </div>
            <div className="p-4 md:p-6">
              {activeTab === 'DEPARTURE' ? (
                <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                    <button type="button" onClick={() => setRouteType(RouteType.HOTEL_TO_SITE)} className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition flex flex-col md:flex-row items-center justify-center gap-1 ${routeType === RouteType.HOTEL_TO_SITE ? 'bg-white dark:bg-slate-800 shadow text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}><span>Hotel</span> <span className="text-slate-300 dark:text-slate-500">→</span> <span>Site</span></button>
                    <button type="button" onClick={() => setRouteType(RouteType.SITE_TO_HOTEL)} className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition flex flex-col md:flex-row items-center justify-center gap-1 ${routeType === RouteType.SITE_TO_HOTEL ? 'bg-white dark:bg-slate-800 shadow text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}><span>Site</span> <span className="text-slate-300 dark:text-slate-500">→</span> <span>Hotel</span></button>
                  </div>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block pl-1">Departure</label><SearchableDropdown options={departOptions} value={departId} onChange={setDepartId} placeholder="Select Departure" icon={<MapPin size={16} />} /></div>
                    <div><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block pl-1">Arrival</label><SearchableDropdown options={arriveOptions} value={arriveId} onChange={setArriveId} placeholder="Select Arrival" icon={<MapPin size={16} />} /></div>
                  </div>
                  <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Driver Name</label><input type="text" value={driver} onChange={e => setDriver(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-50 text-base shadow-sm" placeholder="Driver Name" required /></div>
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Company</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-50 text-base shadow-sm" placeholder="Company" required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 truncate">Bus #</label><input type="text" inputMode="numeric" value={busNo} onChange={e => setBusNo(e.target.value)} className="w-full px-3 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-50 text-center font-medium text-base shadow-sm" placeholder="#" required /></div>
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 truncate">Pax</label><input type="number" inputMode="numeric" value={passengers} onChange={e => setPassengers(e.target.value)} className="w-full px-3 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-50 text-center font-medium text-base shadow-sm" placeholder="0" required /></div>
                      </div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-slate-50 text-base shadow-sm" placeholder="Optional details..." rows={2} /></div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-700/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2">{isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><span>Log Departure</span><Bus size={20} /></>}</button>
                </form>
              ) : (
                <form onSubmit={handleCheckInSubmit} className="space-y-6 animate-fadeIn">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 p-3 rounded-lg text-sm text-orange-800 dark:text-orange-300 flex items-start gap-2"><ArrowDownCircle className="flex-shrink-0 mt-0.5" size={16} /><p>Log a bus arrival at a hotel.</p></div>
                  <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Location</label><SearchableDropdown options={hotelLocs} value={checkInLocId} onChange={setCheckInLocId} placeholder="Select Hotel" icon={<Building size={18} />} /></div>
                  <div className="space-y-4">
                      <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Company</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-slate-50 text-base" placeholder="e.g. CharterCo" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Driver</label><input type="text" value={driver} onChange={e => setDriver(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-slate-50 text-base" placeholder="Name" required /></div>
                        <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Bus #</label><input type="text" inputMode="numeric" value={busNo} onChange={e => setBusNo(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-slate-50 text-base" placeholder="#" required /></div>
                      </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2">{isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><span>Confirm Check-in</span><CheckCircle2 size={20} /></>}</button>
                </form>
              )}
              {successMsg && <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 rounded-lg text-center font-medium animate-pulse border border-green-200 dark:border-green-700/50 mt-4">{successMsg}</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'DEPARTURE' ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:h-[500px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>In-Transit Buses</h3><span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{activeTrips.length}</span></div>
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
                {activeTrips.length === 0 && <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500"><Bus size={40} className="mb-2 opacity-20" /><p>No buses currently in transit.</p></div>}
                {activeTrips.map(log => {
                  const isOwner = log.userId === currentUser.id;
                  return (
                  <div key={log.id} className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 md:p-4 rounded-xl shadow-sm relative overflow-hidden transition-all duration-300 ${isOwner ? 'breathing-card bg-blue-50/40 dark:bg-transparent' : ''}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div className="pl-3">
                        <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{log.routeType === RouteType.HOTEL_TO_SITE ? 'Hotel → Site' : 'Site → Hotel'}<span className="text-slate-300 dark:text-slate-600">|</span><Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div><span className="bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded border border-blue-100 dark:border-blue-900">Bus {log.busNumber}</span></div>
                        <div className="mb-3"><div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm leading-tight"><span className="truncate w-[45%]">{getLocationName(log.departLocationId)}</span><span className="text-slate-300 dark:text-slate-500">➝</span><span className="truncate w-[45%]">{getLocationName(log.arrivalLocationId)}</span></div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2"><span>{log.companyName}</span><span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span><span>{log.driverName}</span><span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span><span className="font-semibold text-slate-700 dark:text-slate-200">{log.passengerCount} Pax</span></div>{!isOwner && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1"><UserIcon size={10} /> Logged by: {getUserName(log.userId)}</div>}</div>
                        {log.notes && <div className="mb-3"><button onClick={() => toggleNote(log.id)} className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline focus:outline-none">{expandedNotes.has(log.id) ? 'Hide Notes' : 'Show Notes'}</button>{expandedNotes.has(log.id) && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 p-2 rounded">{log.notes}</div>}</div>}
                        {(isAdmin || isOwner) ? <button onClick={() => handleArrive(log.id)} className="w-full bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50 text-sm font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Mark Arrived</button> : <div className="w-full bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"><Eye size={14} /> Tracking Only</div>}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50/50 dark:bg-orange-900/20 flex justify-between items-center"><h3 className="font-bold text-orange-900 dark:text-orange-200 flex items-center gap-2"><History size={18} />Recent Bus Check-ins (Today)</h3></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentCheckIns.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500"><ArrowDownCircle size={40} className="mb-2 opacity-20" /><p>No recent check-ins recorded today.</p></div>}
                {recentCheckIns.map(checkIn => (
                  <div key={checkIn.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm flex justify-between items-center">
                      <div><div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{getLocationName(checkIn.locationId)}</div><div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2"><span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">Bus {checkIn.busNumber}</span><span>{checkIn.companyName}</span></div><div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1"><UserIcon size={10} /> Driver: {checkIn.driverName}</div></div>
                      <div className="text-right text-sm text-slate-500 dark:text-slate-400">{editingCheckInId === checkIn.id ? <div className="flex flex-col items-end gap-1"><input type="datetime-local" className="border rounded p-1 text-xs bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50" value={editingCheckInTime} onChange={(e) => setEditingCheckInTime(e.target.value)}/><button onClick={saveCheckInTime} className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"><Save size={12} /> Save</button></div> : <><div className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-end gap-1 group cursor-pointer" onClick={() => { setEditingCheckInId(checkIn.id); const d = new Date(checkIn.timestamp); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); setEditingCheckInTime(d.toISOString().slice(0, 16)); }}>{new Date(checkIn.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}<Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-blue-500 dark:text-blue-400" /></div><div className="text-xs text-slate-400 dark:text-slate-500">{new Date(checkIn.timestamp).toLocaleDateString()}</div></>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'DEPARTURE' && (currentUser.permissions.canViewHistory ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hidden md:block">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2"><History size={18} className="text-slate-500 dark:text-slate-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Arrivals</h3></div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                {historyLogs.length === 0 && <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-sm">No recent history.</div>}
                {historyLogs.map(log => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex justify-between items-center text-sm">
                    <div><div className="font-medium text-slate-700 dark:text-slate-200">{getLocationName(log.departLocationId)} → {getLocationName(log.arrivalLocationId)}</div><div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><span>Arr: {log.actualArrivalTime ? new Date(log.actualArrivalTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</span><span className="hidden md:inline">Dep: {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span>Bus {log.busNumber}</span>{!isAdmin && <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/50 dark:text-blue-300 px-1 rounded flex items-center gap-1"><UserIcon size={10} /> {getUserName(log.userId)}</span>}{log.notes && <span className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-1.5 rounded flex items-center gap-0.5 cursor-help" title={log.notes}><FileText size={10} /> Notes</span>}</div></div>
                    <div className="text-right"><span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">Completed</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center hidden md:block"><AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" /><h3 className="text-slate-800 dark:text-slate-100 font-medium">History Hidden</h3><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">You do not have permission to view past logs.</p></div>
          ))}
        </div>
      </div>
    </div>
  );
};