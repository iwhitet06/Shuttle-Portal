import { createClient } from '@supabase/supabase-js';
import { AppData, User, Location, LogEntry, BusCheckIn, Message, UserRole, UserStatus, LocationType, TripStatus, UserPermissions, RouteType } from '../types';

// Initialize Supabase Client
const getEnvVar = (key: string, fallback: string = '') => {
  try {
    const meta = import.meta as any;
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    // Ignore
  }
  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://onuihnhwiozeyphrfofk.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWlobmh3aW96ZXlwaHJmb2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODM4MTgsImV4cCI6MjA4Njc1OTgxOH0.mu9ivIid8ZBZnCHabFswkVYPksk15Nldkjd135Ec0eU');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER FUNCTIONS ---

const mapUser = (data: any): User => {
  // SECURITY OVERRIDE: 000-000-0000 is ALWAYS System Admin
  if (data.phone === '000-000-0000') {
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: { canViewHistory: true, canLogTrips: true, allowedLocationIds: undefined }, // Full access
      joinedAt: data.joined_at,
      currentLocationId: data.current_location_id,
      assignedWorksiteId: data.assigned_worksite_id
    };
  }

  // Normalize Role to uppercase to match Enum
  let normalizedRole = UserRole.AGENT;
  const dbRole = (data.role || '').toUpperCase();
  
  if (dbRole === 'ADMIN') normalizedRole = UserRole.ADMIN;
  else normalizedRole = UserRole.AGENT; // Default fallback for any legacy or unknown roles

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    role: normalizedRole,
    status: data.status as UserStatus,
    permissions: data.permissions || { canViewHistory: true, canLogTrips: true },
    joinedAt: data.joined_at,
    currentLocationId: data.current_location_id,
    assignedWorksiteId: data.assigned_worksite_id
  };
};

const mapLocation = (data: any): Location => ({
  id: data.id,
  name: data.name,
  type: data.type as LocationType,
  isActive: data.is_active,
  address: data.address
});

const mapLogEntry = (data: any): LogEntry => ({
  id: data.id,
  userId: data.user_id,
  timestamp: data.timestamp,
  routeType: data.route_type as RouteType,
  departLocationId: data.depart_location_id,
  arrivalLocationId: data.arrival_location_id,
  driverName: data.driver_name,
  companyName: data.company_name,
  busNumber: data.bus_number,
  passengerCount: data.passenger_count,
  eta: data.eta,
  status: data.status as TripStatus,
  actualArrivalTime: data.actual_arrival_time,
  notes: data.notes
});

const mapBusCheckIn = (data: any): BusCheckIn => ({
  id: data.id,
  userId: data.user_id,
  timestamp: data.timestamp,
  locationId: data.location_id,
  driverName: data.driver_name,
  companyName: data.company_name,
  busNumber: data.bus_number
});

const mapMessage = (data: any): Message => ({
  id: data.id,
  fromUserId: data.from_user_id,
  toUserId: data.to_user_id,
  content: data.content,
  timestamp: data.timestamp,
  isRead: data.is_read
});

export const loadData = async (): Promise<AppData> => {
  const [users, locations, logs, checkins, messages] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('logs').select('*').order('timestamp', { ascending: false }),
    supabase.from('bus_checkins').select('*').order('timestamp', { ascending: false }),
    supabase.from('messages').select('*').order('timestamp', { ascending: true })
  ]);

  return {
    users: (users.data || []).map(mapUser),
    locations: (locations.data || []).map(mapLocation),
    logs: (logs.data || []).map(mapLogEntry),
    busCheckIns: (checkins.data || []).map(mapBusCheckIn),
    messages: (messages.data || []).map(mapMessage),
    currentUser: null
  };
};

export const registerUser = async (firstName: string, lastName: string, phone: string): Promise<User | null> => {
  const isSystemAdmin = phone === '000-000-0000';
  
  const newUser = {
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    role: isSystemAdmin ? UserRole.ADMIN : UserRole.AGENT,
    status: isSystemAdmin ? UserStatus.ACTIVE : UserStatus.PENDING,
    permissions: { canViewHistory: true, canLogTrips: true }
  };
  const { data, error } = await supabase.from('users').insert([newUser]).select().single();
  if (error) { console.error(error); return null; }
  return mapUser(data);
};

export const loginUser = async (firstName: string, lastName: string, phone: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users').select('*')
    .ilike('first_name', firstName).ilike('last_name', lastName).eq('phone', phone).maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
};

export const createLog = async (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>) => {
  const dbEntry = {
    user_id: entry.userId,
    route_type: entry.routeType,
    depart_location_id: entry.departLocationId,
    arrival_location_id: entry.arrivalLocationId,
    driver_name: entry.driverName,
    company_name: entry.companyName,
    bus_number: entry.busNumber,
    passenger_count: entry.passengerCount,
    eta: entry.eta,
    notes: entry.notes,
    status: TripStatus.IN_TRANSIT,
    timestamp: new Date().toISOString()
  };
  await supabase.from('logs').insert([dbEntry]);
};

export const updateLog = async (logId: string, updates: Partial<LogEntry>) => {
  const dbUpdates: any = {};
  if (updates.driverName) dbUpdates.driver_name = updates.driverName;
  if (updates.companyName) dbUpdates.company_name = updates.companyName;
  if (updates.busNumber) dbUpdates.bus_number = updates.busNumber;
  if (updates.passengerCount !== undefined) dbUpdates.passenger_count = updates.passengerCount;
  if (updates.timestamp) dbUpdates.timestamp = updates.timestamp;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.eta) dbUpdates.eta = updates.eta;
  
  await supabase.from('logs').update(dbUpdates).eq('id', logId);
};

export const deleteLog = async (logId: string) => {
  await supabase.from('logs').delete().eq('id', logId);
};

export const createBusCheckIn = async (entry: Omit<BusCheckIn, 'id' | 'timestamp'>) => {
  const dbEntry = {
    user_id: entry.userId,
    location_id: entry.locationId,
    driver_name: entry.driverName,
    company_name: entry.companyName,
    bus_number: entry.busNumber,
    timestamp: new Date().toISOString()
  };
  await supabase.from('bus_checkins').insert([dbEntry]);
};

export const updateBusCheckIn = async (id: string, timestamp: string) => {
  await supabase.from('bus_checkins').update({ timestamp }).eq('id', id);
};

export const markTripArrived = async (logId: string) => {
  await supabase.from('logs').update({ status: TripStatus.ARRIVED, actual_arrival_time: new Date().toISOString() }).eq('id', logId);
};

export const sendMessage = async (fromId: string, toId: string, content: string) => {
  await supabase.from('messages').insert([{ from_user_id: fromId, to_user_id: toId, content, timestamp: new Date().toISOString(), is_read: false }]);
};

export const markMessagesAsRead = async (fromUserId: string, toUserId: string) => {
  await supabase.from('messages').update({ is_read: true }).eq('from_user_id', fromUserId).eq('to_user_id', toUserId).eq('is_read', false);
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
  await supabase.from('users').update({ status }).eq('id', userId);
};

export const updateUserRole = async (userId: string, role: UserRole) => {
  await supabase.from('users').update({ role }).eq('id', userId);
};

// Deprecated toggle, keep for compatibility but prefer updateUserRole
export const toggleUserRole = async (userId: string) => {
  // Fetch current role
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  if (data) {
    let newRole = UserRole.AGENT;
    // Simple toggle logic since we only have ADMIN and AGENT now
    if (data.role === UserRole.AGENT || data.role === 'ONSITE_COORDINATOR') newRole = UserRole.ADMIN;
    else newRole = UserRole.AGENT; 
    
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
  }
};

export const toggleUserPermission = async (userId: string, permission: keyof UserPermissions) => {
  const { data } = await supabase.from('users').select('permissions').eq('id', userId).single();
  if (data && data.permissions) {
    const perms = data.permissions as UserPermissions;
    if (permission !== 'allowedLocationIds') {
        await supabase.from('users').update({ permissions: { ...perms, [permission]: !perms[permission] } }).eq('id', userId);
    }
  }
};

export const updateUserAllowedLocations = async (userId: string, locationIds: string[] | undefined) => {
    const { data } = await supabase.from('users').select('permissions').eq('id', userId).single();
    if (data && data.permissions) {
        const perms = data.permissions as UserPermissions;
        await supabase.from('users').update({ permissions: { ...perms, allowedLocationIds: locationIds } }).eq('id', userId);
    }
};

export const updateUserLocation = async (userId: string, locationId: string) => {
  await supabase.from('users').update({ current_location_id: locationId }).eq('id', userId);
};

export const updateUserAssignedWorksite = async (userId: string, worksiteId: string) => {
  await supabase.from('users').update({ assigned_worksite_id: worksiteId }).eq('id', userId);
};

export const toggleLocation = async (locationId: string) => {
  const { data } = await supabase.from('locations').select('is_active').eq('id', locationId).single();
  if (data) {
    await supabase.from('locations').update({ is_active: !data.is_active }).eq('id', locationId);
  }
};

export const addLocation = async (name: string, type: LocationType, address?: string) => {
  await supabase.from('locations').insert([{ name, type, address, is_active: true }]);
};

export const updateLocation = async (id: string, updates: Partial<Location>) => {
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.address) dbUpdates.address = updates.address;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  await supabase.from('locations').update(dbUpdates).eq('id', id);
};

// --- DAILY CLEANUP LOGIC ---
export const cleanupStaleTrips = async () => {
  // 1. Fetch active trips
  const { data: activeTrips, error } = await supabase
    .from('logs')
    .select('*')
    .eq('status', TripStatus.IN_TRANSIT);

  if (error || !activeTrips || activeTrips.length === 0) return;

  // 2. Calculate Midnight PST for Today
  // This ensures we check against the start of the current day in the specific timezone
  const pstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const pstTodayMidnight = new Date(pstNow);
  pstTodayMidnight.setHours(0, 0, 0, 0);

  // 3. Process updates
  const updates = activeTrips.map(async (trip) => {
    // Convert the trip timestamp (UTC/ISO) to PST
    const tripTimePST = new Date(new Date(trip.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    
    // If the trip happened before midnight today (PST), it belongs to a previous day
    if (tripTimePST < pstTodayMidnight) {
       await supabase.from('logs').update({ 
           status: TripStatus.ARRIVED,
           actual_arrival_time: new Date().toISOString(), // Auto-close timestamp
           notes: trip.notes ? trip.notes + " [Auto-closed]" : "[Auto-closed]"
       }).eq('id', trip.id);
    }
  });

  await Promise.all(updates);
};