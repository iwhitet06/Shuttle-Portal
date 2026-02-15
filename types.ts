
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  ONSITE_COORDINATOR = 'ONSITE_COORDINATOR',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export interface UserPermissions {
  canViewHistory: boolean;
  canLogTrips: boolean;
  allowedLocationIds?: string[]; // If undefined/null, user has access to all locations. If array, restricted to these IDs.
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  joinedAt: string;
  currentLocationId?: string; // Track where the agent is currently physically stationed (e.g. Hotel)
  assignedWorksiteId?: string; // Track the target worksite (e.g. Hospital)
}

export enum LocationType {
  HOTEL = 'HOTEL',
  WORKSITE = 'WORKSITE',
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  isActive: boolean;
  address?: string;
}

export enum RouteType {
  HOTEL_TO_SITE = 'HOTEL_TO_SITE',
  SITE_TO_HOTEL = 'SITE_TO_HOTEL',
}

export enum TripStatus {
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
}

export interface LogEntry {
  id: string;
  userId: string; // The agent who logged it
  timestamp: string; // Departure Time
  routeType: RouteType;
  departLocationId: string;
  arrivalLocationId: string;
  driverName: string;
  companyName: string;
  busNumber: string;
  passengerCount: number;
  eta: string;
  status: TripStatus;
  actualArrivalTime?: string;
  notes?: string;
}

export interface BusCheckIn {
  id: string;
  userId: string;
  timestamp: string;
  locationId: string;
  driverName: string;
  companyName: string;
  busNumber: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface AppData {
  users: User[];
  locations: Location[];
  logs: LogEntry[];
  busCheckIns: BusCheckIn[];
  messages: Message[];
  currentUser: User | null;
}
