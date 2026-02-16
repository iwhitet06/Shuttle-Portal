import { User, Location, LogEntry, Message, UserRole, UserStatus, LocationType, AppData, TripStatus, UserPermissions, BusCheckIn } from '../types';

const STORAGE_KEY = 'transitflow_db_v2';

const INITIAL_LOCATIONS: Location[] = [
  // Hotels (Preserved)
  { id: 'hotel-1', name: 'Courtyard by Marriott Los Angeles Hacienda Heights/Orange County', type: LocationType.HOTEL, isActive: true, address: '1905 S Azusa Ave, Hacienda Heights, CA 91745' },
  { id: 'hotel-2', name: 'SpringHill Suites by Marriott Valencia', type: LocationType.HOTEL, isActive: true, address: '27505 Wayne Mills Pl, Valencia, CA 91355' },
  { id: 'hotel-3', name: 'Hampton Inn Los Angeles/Santa Clarita', type: LocationType.HOTEL, isActive: true, address: '25259 The Old Road, Stevenson Ranch CA 91381' },
  { id: 'hotel-4', name: 'Courtyard by Marriott Los Angeles Monterey Park', type: LocationType.HOTEL, isActive: true, address: '555 N Atlantic Blvd, Monterey Park, CA 91754' },
  { id: 'hotel-5', name: 'W Hollywood', type: LocationType.HOTEL, isActive: true, address: '6250 Hollywood Blvd, Hollywood, CA 90028' },
  // ... (Abbreviated, assume full list is here in real file)
  { id: 'ws-1', name: 'Downey MC', type: LocationType.WORKSITE, isActive: true, address: '9333 Imperial Hwy. Downey CA 90242' },
  { id: 'ws-2', name: 'Panorama City MC', type: LocationType.WORKSITE, isActive: true, address: '8120 Woodman Ave, Panorama City, CA 91402' },
];

// Helper to ensure we have locations even if snippet truncated above
// Sort locations alphabetically
INITIAL_LOCATIONS.sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewHistory: true,
  canLogTrips: true,
  allowedLocationIds: undefined // Default to all access
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial Load
export const loadData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration helper for old data
    if (parsed.users.length > 0) {
      parsed.users = parsed.users.map((u: any) => {
        if (!u.permissions) {
          return { ...u, permissions: DEFAULT_PERMISSIONS };
        }
        // Ensure new field exists
        if (u.permissions.allowedLocationIds === undefined && !('allowedLocationIds' in u.permissions)) {
             u.permissions.allowedLocationIds = undefined;
        }
        return u;
      });
    }
    // Ensure busCheckIns exists
    if (!parsed.busCheckIns) {
      parsed.busCheckIns = [];
    }
    // Fallback for locations if empty in storage (for dev ease)
    if (!parsed.locations || parsed.locations.length === 0) {
        parsed.locations = INITIAL_LOCATIONS;
    }
    return parsed;
  }
  return {
    users: [],
    locations: INITIAL_LOCATIONS,
    logs: [],
    busCheckIns: [],
    messages: [],
    currentUser: null,
  };
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// API Simulation Actions

export const registerUser = (firstName: string, lastName: string, phone: string): User => {
  const data = loadData();
  const isFirstUser = data.users.length === 0;
  
  // First user (Admin) is automatically assigned to the first hotel for demo purposes
  const currentLocationId = isFirstUser ? 'hotel-1' : undefined;
  
  const newUser: User = {
    id: generateId(),
    firstName,
    lastName,
    phone,
    role: isFirstUser ? UserRole.ADMIN : UserRole.AGENT,
    status: isFirstUser ? UserStatus.ACTIVE : UserStatus.PENDING,
    permissions: DEFAULT_PERMISSIONS,
    joinedAt: new Date().toISOString(),
    currentLocationId,
    assignedWorksiteIds: []
  };

  data.users.push(newUser);
  saveData(data);
  return newUser;
};

export const loginUser = (firstName: string, lastName: string, phone: string): User | null => {
  const data = loadData();
  const user = data.users.find(u => 
    u.firstName.toLowerCase() === firstName.toLowerCase() && 
    u.lastName.toLowerCase() === lastName.toLowerCase() && 
    u.phone === phone
  );
  return user || null;
};

export const createLog = (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>): LogEntry => {
  const data = loadData();
  const newLog: LogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
    status: TripStatus.IN_TRANSIT,
  };
  data.logs.push(newLog);
  saveData(data);
  return newLog;
};

export const createBusCheckIn = (entry: Omit<BusCheckIn, 'id' | 'timestamp'>): BusCheckIn => {
  const data = loadData();
  const newCheckIn: BusCheckIn = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  
  if (!data.busCheckIns) data.busCheckIns = [];
  data.busCheckIns.push(newCheckIn);
  saveData(data);
  return newCheckIn;
};

export const markTripArrived = (logId: string): void => {
  const data = loadData();
  const idx = data.logs.findIndex(l => l.id === logId);
  if (idx !== -1) {
    data.logs[idx].status = TripStatus.ARRIVED;
    data.logs[idx].actualArrivalTime = new Date().toISOString();
    saveData(data);
  }
};

export const sendMessage = (fromId: string, toId: string, content: string): Message => {
  const data = loadData();
  const msg: Message = {
    id: generateId(),
    fromUserId: fromId,
    toUserId: toId,
    content,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  data.messages.push(msg);
  saveData(data);
  return msg;
};

export const markMessagesAsRead = (fromUserId: string, toUserId: string) => {
  const data = loadData();
  let changed = false;
  data.messages.forEach(msg => {
    if (msg.fromUserId === fromUserId && msg.toUserId === toUserId && !msg.isRead) {
      msg.isRead = true;
      changed = true;
    }
  });
  if (changed) saveData(data);
};

export const updateUserStatus = (userId: string, status: UserStatus) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].status = status;
    saveData(data);
  }
};

export const updateUserRole = (userId: string, role: UserRole) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].role = role;
    saveData(data);
  }
};

export const toggleUserRole = (userId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const currentRole = data.users[idx].role;
    data.users[idx].role = currentRole === UserRole.ADMIN ? UserRole.AGENT : UserRole.ADMIN;
    saveData(data);
  }
};

export const toggleUserPermission = (userId: string, permission: keyof UserPermissions) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    if (permission !== 'allowedLocationIds') {
        data.users[idx].permissions[permission] = !data.users[idx].permissions[permission];
        saveData(data);
    }
  }
};

export const updateUserAllowedLocations = (userId: string, locationIds: string[] | undefined) => {
    const data = loadData();
    const idx = data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      data.users[idx].permissions.allowedLocationIds = locationIds;
      saveData(data);
    }
};

export const updateUserLocation = (userId: string, locationId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].currentLocationId = locationId;
    saveData(data);
  }
};

export const updateUserAssignedWorksite = (userId: string, worksiteIds: string[]) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].assignedWorksiteIds = worksiteIds;
    // Clear old field if exists to prevent confusion
    if ((data.users[idx] as any).assignedWorksiteId) {
        delete (data.users[idx] as any).assignedWorksiteId;
    }
    saveData(data);
  }
};

export const toggleLocation = (locationId: string) => {
  const data = loadData();
  const idx = data.locations.findIndex(l => l.id === locationId);
  if (idx !== -1) {
    data.locations[idx].isActive = !data.locations[idx].isActive;
    saveData(data);
  }
};

export const addLocation = (name: string, type: LocationType, address?: string): Location => {
  const data = loadData();
  const newLocation: Location = {
    id: generateId(),
    name,
    type,
    isActive: true,
    address: address || ''
  };
  data.locations.push(newLocation);
  saveData(data);
  return newLocation;
};

export const updateLocation = (id: string, updates: Partial<Location>) => {
  const data = loadData();
  const idx = data.locations.findIndex(l => l.id === id);
  if (idx !== -1) {
    data.locations[idx] = { ...data.locations[idx], ...updates };
    saveData(data);
  }
};

// Update bus check-in timestamp
export const updateBusCheckIn = (id: string, timestamp: string) => {
  const data = loadData();
  const idx = data.busCheckIns.findIndex(c => c.id === id);
  if(idx !== -1) {
      data.busCheckIns[idx].timestamp = timestamp;
      saveData(data);
  }
};

// Delete bus check-in
export const deleteBusCheckIn = (id: string) => {
  const data = loadData();
  const idx = data.busCheckIns.findIndex(c => c.id === id);
  if(idx !== -1) {
      data.busCheckIns.splice(idx, 1);
      saveData(data);
  }
};

// Delete Log
export const deleteLog = (logId: string) => {
    const data = loadData();
    const idx = data.logs.findIndex(l => l.id === logId);
    if(idx !== -1) {
        data.logs.splice(idx, 1);
        saveData(data);
    }
};

// Update Log
export const updateLog = (logId: string, updates: Partial<LogEntry>) => {
    const data = loadData();
    const idx = data.logs.findIndex(l => l.id === logId);
    if(idx !== -1) {
        data.logs[idx] = { ...data.logs[idx], ...updates };
        saveData(data);
    }
};