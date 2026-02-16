#!/bin/bash

# Shuttle Portal Reconstruction Script
# Run this script to recreate the project file structure.

echo "Creating directories..."
mkdir -p components services

echo "Writing index.html..."
cat << 'EOF' > index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shuttle Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
      /* Hide scrollbar for Chrome, Safari and Opera */
      .no-scrollbar::-webkit-scrollbar {
          display: none;
      }
      /* Hide scrollbar for IE, Edge and Firefox */
      .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
      }
    </style>
  <script type="importmap">
{
  "imports": {
    "recharts": "https://esm.sh/recharts@^3.7.0",
    "react-dom/": "https://esm.sh/react-dom@^19.2.4/",
    "react/": "https://esm.sh/react@^19.2.4/",
    "react": "https://esm.sh/react@^19.2.4",
    "lucide-react": "https://esm.sh/lucide-react@^0.564.0"
  }
}
</script>
</head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

echo "Writing index.tsx..."
cat << 'EOF' > index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

echo "Writing metadata.json..."
cat << 'EOF' > metadata.json
{
  "name": "Shuttle Portal",
  "description": "A comprehensive charter bus log management system for hotels and worksites with admin oversight, real-time logging, and messaging.",
  "requestFramePermissions": []
}
EOF

echo "Writing types.ts..."
cat << 'EOF' > types.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export interface UserPermissions {
  canViewHistory: boolean;
  canLogTrips: boolean;
  allowedLocationIds?: string[];
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
  currentLocationId?: string;
  assignedWorksiteIds?: string[];
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
  userId: string;
  timestamp: string;
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
  toUserId?: string;
  groupId?: string;
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
EOF

echo "Project reconstructed successfully!"
