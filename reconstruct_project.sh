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
    "@google/genai": "https://esm.sh/@google/genai@^1.41.0",
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
EOF

echo "Writing App.tsx..."
cat << 'EOF' > App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User, AppData, UserStatus, UserRole, RouteType } from './types';
import { loadData } from './services/mockBackend';
import { LoginScreen } from './components/LoginScreen';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MessagingView } from './components/MessagingView';
import { LayoutDashboard, MessageSquare, LogOut, Clock, Shield, Bus, Settings, Search, X, User as UserIcon, Calendar, MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(loadData());
  const [view, setView] = useState<'LOG_TRIPS' | 'MESSAGES' | 'ADMIN_CONSOLE'>('LOG_TRIPS');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll for updates (simulating real-time)
    const interval = setInterval(() => {
      refreshData();
    }, 2000);

    // Close search on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const refreshData = () => {
    setData(loadData());
    // Also update current user object if their status changed remotely
    if (currentUser) {
        const updatedUser = loadData().users.find(u => u.id === currentUser.id);
        if (updatedUser) setCurrentUser(updatedUser);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('LOG_TRIPS');
    setSearchQuery('');
  };

  // Search Logic
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown';

  const filteredLogs = searchQuery ? data.logs.filter(l => {
    const depName = getLocationName(l.departLocationId).toLowerCase();
    const arrName = getLocationName(l.arrivalLocationId).toLowerCase();
    const q = searchQuery.toLowerCase();
    
    return l.driverName.toLowerCase().includes(q) ||
           l.companyName.toLowerCase().includes(q) ||
           l.busNumber.toLowerCase().includes(q) ||
           depName.includes(q) ||
           arrName.includes(q);
  }).slice(0, 5) : [];

  const filteredUsers = searchQuery ? data.users.filter(u => {
    const nameMatch = (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchQuery.toLowerCase());
    // ONLY Admins can search by phone number
    const phoneMatch = currentUser?.role === UserRole.ADMIN && u.phone.includes(searchQuery);
    return nameMatch || phoneMatch;
  }).slice(0, 5) : [];

  const navigateToMessage = (userId: string) => {
    setTargetUserId(userId);
    setView('MESSAGES');
    clearSearch();
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  // Pending State
  if (currentUser.status === UserStatus.PENDING) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Pending</h2>
          <p className="text-slate-500 mb-6">
            Hi {currentUser.firstName}, your account is currently awaiting administrator approval. 
            Please contact your supervisor or check back later.
          </p>
          <button onClick={handleLogout} className="text-blue-600 font-medium hover:underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Revoked State
  if (currentUser.status === UserStatus.REVOKED) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Revoked</h2>
          <p className="text-slate-500 mb-6">
            Your access to this platform has been revoked by an administrator.
          </p>
          <button onClick={handleLogout} className="text-blue-600 font-medium hover:underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20 md:pb-0">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <span className="text-2xl font-bold text-blue-700 tracking-tight flex items-center gap-2">
                <Bus className="w-6 h-6" />
                <span className="hidden sm:inline">Shuttle Portal</span>
                <span className="sm:hidden">SP</span>
              </span>
            </div>

            {/* Desktop Center Nav */}
            <div className="hidden md:flex space-x-8 mx-4">
               <button 
                 onClick={() => setView('LOG_TRIPS')}
                 className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${view === 'LOG_TRIPS' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
               >
                 Log Trips
               </button>
               <button 
                 onClick={() => setView('MESSAGES')}
                 className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${view === 'MESSAGES' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
               >
                 Messages
               </button>
               {currentUser.role === UserRole.ADMIN && (
                 <button 
                   onClick={() => setView('ADMIN_CONSOLE')}
                   className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${view === 'ADMIN_CONSOLE' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                 >
                   Admin Console
                 </button>
               )}
            </div>

            {/* Search Bar & Profile */}
            <div className="flex items-center justify-end flex-1 gap-2 sm:gap-4">
              
              {/* Global Search Bar */}
              <div className="relative max-w-xs w-full" ref={searchRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-full leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition text-slate-900"
                    placeholder="Search logs & users..."
                    value={searchQuery}
                    onChange={handleSearch}
                    onFocus={() => setIsSearchOpen(true)}
                  />
                  {searchQuery && (
                    <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && searchQuery && (
                  <div className="absolute top-full mt-2 w-full sm:w-80 right-0 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden">
                    
                    {filteredUsers.length === 0 && filteredLogs.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">No results found.</div>
                    )}

                    {/* Users Results */}
                    {filteredUsers.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Users</div>
                        {filteredUsers.map(user => (
                          <button 
                            key={user.id} 
                            onClick={() => navigateToMessage(user.id)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center space-x-3 group"
                          >
                            <div className="bg-slate-100 p-2 rounded-full group-hover:bg-blue-100 transition">
                              <UserIcon size={16} className="text-slate-500 group-hover:text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                              {/* PRIVACY FIX: Only show phone number if user is Admin */}
                              {currentUser?.role === UserRole.ADMIN && (
                                <div className="text-xs text-slate-500">{user.phone}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Logs Results */}
                    {filteredLogs.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 mt-1">Logs</div>
                        {filteredLogs.map(log => (
                          <div key={log.id} className="px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                            <div className="flex items-center justify-between mb-1">
                               <div className="text-sm font-bold text-slate-800">{log.companyName}</div>
                               <div className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Bus {log.busNumber}</div>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                               <UserIcon size={10} /> {log.driverName}
                            </div>
                            <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin size={10} /> 
                                {log.routeType === RouteType.HOTEL_TO_SITE ? 'Hotel -> Site' : 'Site -> Hotel'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Profile (Desktop) */}
              <div className="text-right hidden sm:block flex-shrink-0">
                <div className="text-sm font-medium text-slate-900">{currentUser.firstName} {currentUser.lastName}</div>
                {/* PRIVACY FIX: Hide own phone number in navbar for consistency or keep it. Keeping it as user knows their own number. */}
                <div className="text-xs text-slate-500">{currentUser.phone}</div>
              </div>
              
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="py-6">
        {view === 'LOG_TRIPS' && (
           <AgentDashboard data={data} currentUser={currentUser} refreshData={refreshData} />
        )}
        {view === 'MESSAGES' && (
           <MessagingView data={data} currentUser={currentUser} refreshData={refreshData} initialSelectedUserId={targetUserId} />
        )}
        {view === 'ADMIN_CONSOLE' && currentUser.role === UserRole.ADMIN && (
           <AdminDashboard data={data} refreshData={refreshData} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 md:hidden z-50">
        <button 
          onClick={() => setView('LOG_TRIPS')}
          className={`flex flex-col items-center space-y-1 ${view === 'LOG_TRIPS' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-medium">Log Trips</span>
        </button>
        <button 
          onClick={() => setView('MESSAGES')}
          className={`flex flex-col items-center space-y-1 ${view === 'MESSAGES' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <MessageSquare size={24} />
          <span className="text-[10px] font-medium">Messages</span>
        </button>
        {currentUser.role === UserRole.ADMIN && (
          <button 
            onClick={() => setView('ADMIN_CONSOLE')}
            className={`flex flex-col items-center space-y-1 ${view === 'ADMIN_CONSOLE' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Settings size={24} />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default App;
EOF

echo "Writing components/SearchableDropdown.tsx..."
cat << 'EOF' > components/SearchableDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableDropdownProps {
  options: { id: string; name: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const selectedName = options.find(o => o.id === value)?.name;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full bg-white border transition group cursor-pointer flex items-center justify-between ${
            compact 
            ? 'px-3 py-2 border-slate-300 rounded-lg hover:border-blue-400' 
            : 'pl-10 pr-4 py-3 bg-slate-50 border-slate-200 rounded-xl hover:bg-white hover:border-blue-300'
        }`}
      >
        {icon && !compact && <div className="absolute left-3 text-slate-400 group-hover:text-blue-500 transition">{icon}</div>}
        <span className={`truncate mr-2 ${compact ? 'text-sm' : 'text-sm font-medium'} ${value && value !== 'ALL' && value !== '' ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedName || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden max-h-60 flex flex-col animate-fadeIn">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-slate-400 w-3 h-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">No matches found</div>}
            {filtered.map(opt => (
              <div
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition ${value === opt.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {opt.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
EOF

echo "Writing components/LoginScreen.tsx..."
cat << 'EOF' > components/LoginScreen.tsx
import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/mockBackend';
import { ShieldCheck, Bus, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !firstName || !lastName) {
      setError('All fields are required.');
      return;
    }

    if (isRegistering) {
      if (!privacyAccepted) {
        setError('You must accept the privacy policy to continue.');
        return;
      }
      const newUser = registerUser(firstName, lastName, phone);
      onLogin(newUser);
    } else {
      const user = loginUser(firstName, lastName, phone);
      if (user) {
        onLogin(user);
      } else {
        setError('User not found. Please register first.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full">
            <Bus className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Shuttle Portal</h1>
        <p className="text-center text-slate-500 mb-8">
          {isRegistering ? 'Create your account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
              placeholder="555-0123"
            />
          </div>

          {isRegistering && (
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="privacy"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="privacy" className="text-xs text-slate-600">
                I acknowledge that my name and phone number are collected for identification and security purposes. 
                This data is visible to platform administrators. I accept the data privacy policy.
              </label>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center space-x-2"
          >
            {isRegistering ? (
               <><span>Request Access</span> <ShieldCheck size={18} /></>
            ) : (
               <><span>Sign In</span> <KeyRound size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setPrivacyAccepted(false);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'New user? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
EOF

echo "Writing components/AdminDashboard.tsx..."
cat << 'EOF' > components/AdminDashboard.tsx
import React, { useState } from 'react';
import { AppData, User, UserStatus, UserRole, Location, TripStatus, RouteType, LocationType } from '../types';
import { updateUserStatus, toggleUserRole, toggleUserPermission, toggleLocation, addLocation, updateLocation, updateUserAllowedLocations } from '../services/mockBackend';
import { Users, MapPin, Activity, ShieldAlert, CheckCircle, XCircle, BarChart3, Eye, EyeOff, UserCog, User as UserIcon, ClipboardList, Calendar, Clock, Bus, ArrowRight, Search, Download, X, Plus, Building, Edit2, Save, ArrowDownCircle, History, FileText, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SearchableDropdown } from './SearchableDropdown';

interface AdminDashboardProps {
  data: AppData;
  refreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, refreshData }) => {
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

  const handleAction = (action: () => void) => {
    action();
    refreshData();
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName) return;

    if (editingLocationId) {
        updateLocation(editingLocationId, {
            name: locName,
            type: locType,
            address: locAddress
        });
        setEditingLocationId(null);
    } else {
        addLocation(locName, locType, locAddress);
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

  const savePermissions = () => {
      if (managingPermissionsUser) {
          // Explicitly cast to string[] to resolve potential type inference issues with Array.from
          const newAllowed = isRestrictedMode ? (Array.from(selectedAllowedLocationIds) as string[]) : undefined;
          updateUserAllowedLocations(managingPermissionsUser.id, newAllowed);
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 && (
                <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
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
                </tr>
                {isExpanded && (
                    <tr className="bg-slate-50/50 animate-fadeIn">
                        <td colSpan={7} className="p-4 border-b border-slate-200">
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
                                        {agent && agent.role === UserRole.ADMIN && <span className="text-[10px] text-purple-600 font-bold ml-6 block">Admin</span>}
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
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Active Trips</div>
             <Activity size={16} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{activeTrips}</div>
          <div className="text-xs text-green-600 mt-1 font-medium">Currently on road</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pax Today</div>
             <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{totalPassengersToday}</div>
          <div className="text-xs text-slate-400 mt-1">Total passengers moved</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Completion Rate</div>
             <CheckCircle size={16} className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {totalLogs > 0 ? Math.round((completedTripsToday / totalLogs) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">{completedTripsToday} / {totalLogs} Trips</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
             <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Locations</div>
             <MapPin size={16} className="text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{data.locations.filter(l => l.isActive).length}</div>
          <div className="text-xs text-slate-400 mt-1">Active Stops</div>
        </div>
      </div>

      {/* Logs moved above Charts */}
      {renderLogs()}

      {/* Charts */}
      <div className="grid md:grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
             <BarChart3 className="w-5 h-5 text-indigo-500" /> <span>Peak Traffic Analysis (Hourly Volume)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6 -mt-3">Analyzing departure frequencies to identify staffing bottlenecks.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="trips" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTrips)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
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
              <th className="p-4">Current Location</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Permissions</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-400">No users found matching filters.</td></tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                   <div className="font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                   <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</div>
                </td>
                <td className="p-4 text-slate-500 font-mono">{user.phone}</td>
                <td className="p-4">
                    {user.currentLocationId ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium border border-blue-100">
                            <MapPin size={10} />
                            {getLocationName(user.currentLocationId)}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-xs italic">Not set</span>
                    )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role}
                  </span>
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

                    <div className="w-px bg-slate-200 mx-1"></div>

                    <button 
                      onClick={() => handleAction(() => toggleUserRole(user.id))}
                      className={`p-2 rounded transition ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      title={user.role === UserRole.ADMIN ? "Demote to Agent" : "Promote to Admin"}
                    >
                       {user.role === UserRole.ADMIN ? <UserIcon size={16} /> : <ShieldAlert size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
       
       {activeUsers.length === 0 && revokedUsers.length === 0 && (
         <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-slate-200">
           No users match your current filters.
         </div>
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
    </div>
  );
};
EOF

echo "Writing components/AgentDashboard.tsx..."
cat << 'EOF' > components/AgentDashboard.tsx
import React, { useState, useEffect } from 'react';
import { AppData, User, RouteType, LocationType, LogEntry, TripStatus, UserRole } from '../types';
import { createLog, markTripArrived, createBusCheckIn, updateUserLocation, updateUserAssignedWorksite } from '../services/mockBackend';
import { SearchableDropdown } from './SearchableDropdown';
import { ArrowRightLeft, Bus, Clock, Users, Building, MapPin, CheckCircle2, AlertCircle, History, User as UserIcon, ArrowDownCircle, FileText, ChevronDown, ChevronUp, Briefcase, Settings2, X } from 'lucide-react';

interface AgentDashboardProps {
  data: AppData;
  currentUser: User;
  refreshData: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ data, currentUser, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'DEPARTURE' | 'CHECK_IN'>('DEPARTURE');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departId || !arriveId || !driver || !company || !busNo || !passengers) return;

    createLog({
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
    resetForm();
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInLocId || !driver || !company || !busNo) return;

    createBusCheckIn({
      userId: currentUser.id,
      locationId: checkInLocId,
      driverName: driver,
      companyName: company,
      busNumber: busNo
    });

    setSuccessMsg('Bus Arrival Confirmed!');
    refreshData();
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

  const handleArrive = (id: string) => {
    markTripArrived(id);
    refreshData();
  };

  const toggleRoute = () => {
    setRouteType(prev => prev === RouteType.HOTEL_TO_SITE ? RouteType.SITE_TO_HOTEL : RouteType.HOTEL_TO_SITE);
  };

  const handleLocationChange = (val: string) => {
    updateUserLocation(currentUser.id, val);
    refreshData();
  };

  const handleWorksiteChange = (val: string) => {
    updateUserAssignedWorksite(currentUser.id, val);
    refreshData();
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
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-700/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2"
                  >
                    <span>Log Departure</span>
                    <Bus size={20} />
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
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/20 transition transform active:scale-[0.98] flex items-center justify-center space-x-2"
                  >
                    <span>Confirm Check-in</span>
                    <CheckCircle2 size={20} />
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
                        <div className="font-bold text-slate-800">{new Date(checkIn.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        <div className="text-xs text-slate-400">{new Date(checkIn.timestamp).toLocaleDateString()}</div>
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
EOF

echo "Writing components/MessagingView.tsx..."
cat << 'EOF' > components/MessagingView.tsx
import React, { useState, useEffect } from 'react';
import { AppData, User, UserRole } from '../types';
import { sendMessage, markMessagesAsRead, updateUserLocation } from '../services/mockBackend';
import { Send, User as UserIcon, MapPin, BadgeCheck } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';

interface MessagingViewProps {
  data: AppData;
  currentUser: User;
  refreshData: () => void;
  initialSelectedUserId?: string | null;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ data, currentUser, refreshData, initialSelectedUserId }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
  const [msgContent, setMsgContent] = useState('');

  // Update selected user if the prop changes (e.g. navigation from search)
  useEffect(() => {
    if (initialSelectedUserId) {
      handleSelectUser(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  const handleSelectUser = (id: string) => {
      setSelectedUserId(id);
      markMessagesAsRead(id, currentUser.id); // Mark messages from sender to me as read
      refreshData();
  };

  const handleLocationChange = (val: string) => {
    updateUserLocation(currentUser.id, val);
    refreshData();
  };

  // Get active locations for the dropdown, filtered by permissions
  const allowedIds = currentUser.permissions.allowedLocationIds;
  const activeLocations = data.locations.filter(l => {
     if (!l.isActive) return false;
     if (!allowedIds || allowedIds.length === 0) return true;
     return allowedIds.includes(l.id);
  });

  // Get list of users to message with metadata for sorting and badges
  const allUsers = data.users
    .filter(u => u.id !== currentUser.id && u.status === 'ACTIVE')
    .map(u => {
        const msgs = data.messages.filter(m => 
            (m.fromUserId === currentUser.id && m.toUserId === u.id) ||
            (m.fromUserId === u.id && m.toUserId === currentUser.id)
        ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first

        const lastMsg = msgs[0];
        const unreadCount = msgs.filter(m => m.fromUserId === u.id && m.toUserId === currentUser.id && !m.isRead).length;

        // Check if this user is a coordinator for my current location
        // They must be an ADMIN and at the SAME location as me
        const isCoordinator = 
            currentUser.currentLocationId && 
            u.role === UserRole.ADMIN && 
            u.currentLocationId === currentUser.currentLocationId;

        return {
            user: u,
            lastMsgTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
            unreadCount,
            isCoordinator
        };
    });

  // Split into Coordinators and Others
  const coordinators = allUsers.filter(u => u.isCoordinator);
  const others = allUsers
    .filter(u => !u.isCoordinator)
    .sort((a, b) => b.lastMsgTime - a.lastMsgTime); // Sort by most recent message

  // Filter messages for selected conversation
  const conversation = selectedUserId 
    ? data.messages.filter(m => 
        (m.fromUserId === currentUser.id && m.toUserId === selectedUserId) ||
        (m.fromUserId === selectedUserId && m.toUserId === currentUser.id)
      ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !msgContent.trim()) return;
    sendMessage(currentUser.id, selectedUserId, msgContent);
    setMsgContent('');
    refreshData();
  };

  const renderUserItem = ({ user, unreadCount, isCoordinator }: typeof allUsers[0]) => (
    <button
      key={user.id}
      onClick={() => handleSelectUser(user.id)}
      className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition flex items-center justify-between ${selectedUserId === user.id ? 'bg-blue-50 border-blue-100' : ''} ${isCoordinator ? 'bg-indigo-50/50' : ''}`}
    >
      <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full relative ${isCoordinator ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
            {isCoordinator ? <BadgeCheck size={20} /> : <UserIcon size={20} />}
          </div>
          <div>
            <div className="font-medium text-slate-800 flex items-center gap-1">
                {user.firstName} {user.lastName}
            </div>
            {isCoordinator ? (
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    On-site Coordinator
                </div>
            ) : (
                <div className="text-xs text-slate-500 uppercase">{user.role}</div>
            )}
          </div>
      </div>
      {unreadCount > 0 && (
          <div className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
              {unreadCount}
          </div>
      )}
    </button>
  );

  return (
    <div className="h-[calc(100vh-100px)] max-w-6xl mx-auto flex flex-col md:flex-row bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`md:w-1/3 border-r border-slate-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Location Selector Box */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <MapPin size={12} /> My Current Location
            </label>
            <SearchableDropdown 
                options={activeLocations} 
                value={currentUser.currentLocationId || ''} 
                onChange={handleLocationChange} 
                placeholder="Select your location..."
                compact={true}
            />
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Select your location to see the assigned On-site Coordinator at the top of your list.
            </p>
        </div>

        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700 text-sm">Contacts</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Coordinators Section */}
          {coordinators.length > 0 && (
            <div className="border-b border-indigo-100">
                {coordinators.map(item => renderUserItem(item))}
            </div>
          )}

          {/* Others Section */}
          {others.map(item => renderUserItem(item))}
          
          {others.length === 0 && coordinators.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                  No active contacts found.
              </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="text-center">
                <Send size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a user to start messaging</p>
                {(!currentUser.currentLocationId) && (
                    <p className="text-xs text-orange-500 mt-2">
                        Tip: Select your location to find your coordinator.
                    </p>
                )}
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
               <div className="flex items-center gap-3">
                   <div className="bg-slate-100 p-2 rounded-full">
                       <UserIcon size={20} className="text-slate-600" />
                   </div>
                   <div>
                        <div className="font-bold text-slate-800">
                            {allUsers.find(item => item.user.id === selectedUserId)?.user.firstName} {allUsers.find(item => item.user.id === selectedUserId)?.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                             {allUsers.find(item => item.user.id === selectedUserId)?.isCoordinator ? 'On-site Coordinator' : 'TransitFlow User'}
                        </div>
                   </div>
               </div>
               <button onClick={() => setSelectedUserId(null)} className="md:hidden text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                 Back
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
               {conversation.length === 0 && <p className="text-center text-slate-400 text-sm mt-4">No messages yet.</p>}
               {conversation.map(msg => {
                 const isMe = msg.fromUserId === currentUser.id;
                 return (
                   <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                       {msg.content}
                       <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                         {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={msgContent}
                onChange={e => setMsgContent(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              />
              <button 
                type="submit"
                disabled={!msgContent.trim()}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
EOF

echo "Writing services/mockBackend.ts..."
cat << 'EOF' > services/mockBackend.ts
import { User, Location, LogEntry, Message, UserRole, UserStatus, LocationType, AppData, TripStatus, UserPermissions, BusCheckIn } from '../types';

const STORAGE_KEY = 'transitflow_db_v2';

const INITIAL_LOCATIONS: Location[] = [
  // Hotels (Preserved)
  { id: 'hotel-1', name: 'Courtyard by Marriott Los Angeles Hacienda Heights/Orange County', type: LocationType.HOTEL, isActive: true, address: '1905 S Azusa Ave, Hacienda Heights, CA 91745' },
  { id: 'hotel-2', name: 'SpringHill Suites by Marriott Valencia', type: LocationType.HOTEL, isActive: true, address: '27505 Wayne Mills Pl, Valencia, CA 91355' },
  { id: 'hotel-3', name: 'Hampton Inn Los Angeles/Santa Clarita', type: LocationType.HOTEL, isActive: true, address: '25259 The Old Road, Stevenson Ranch CA 91381' },
  { id: 'hotel-4', name: 'Courtyard by Marriott Los Angeles Monterey Park', type: LocationType.HOTEL, isActive: true, address: '555 N Atlantic Blvd, Monterey Park, CA 91754' },
  { id: 'hotel-5', name: 'W Hollywood', type: LocationType.HOTEL, isActive: true, address: '6250 Hollywood Blvd, Hollywood, CA 90028' },
  { id: 'hotel-6', name: 'Courtyard by Marriott Los Angeles Pasadena/Old Town', type: LocationType.HOTEL, isActive: true, address: '180 N Fair Oaks Ave, Pasadena, CA 91103' },
  { id: 'hotel-7', name: 'Courtyard by Marriott Los Angeles Sherman Oaks', type: LocationType.HOTEL, isActive: true, address: '15433 Ventura Blvd, Sherman Oaks, CA 91403' },
  { id: 'hotel-8', name: 'Newport Beach Marriott Bayview', type: LocationType.HOTEL, isActive: true, address: '500 Bayview Cir, Newport Beach, CA 92660' },
  { id: 'hotel-9', name: 'Sheraton Universal Hotel', type: LocationType.HOTEL, isActive: true, address: '333 Universal Hollywood Dr, Universal City, CA 91608' },
  { id: 'hotel-10', name: 'Hampton Inn by Hilton North Hollywood', type: LocationType.HOTEL, isActive: true, address: '11350 Burbank Blvd, North Hollywood, CA 91601' },
  { id: 'hotel-11', name: 'Sheraton Gateway Los Angeles Hotel', type: LocationType.HOTEL, isActive: true, address: '6101 W Century Blvd, Los Angeles, CA 90045' },
  { id: 'hotel-12', name: 'Courtyard by Marriott Ventura Simi Valley', type: LocationType.HOTEL, isActive: true, address: '191 Cochran St, Simi Valley, CA 93065' },
  { id: 'hotel-13', name: 'DoubleTree by Hilton Hotel Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '222 N Vineyard Ave, Ontario, CA 91764' },
  { id: 'hotel-14', name: 'Courtyard by Marriott Bakersfield', type: LocationType.HOTEL, isActive: true, address: '3601 Marriott Dr, Bakersfield, CA 93308' },
  { id: 'hotel-15', name: 'Courtyard by Marriott Long Beach Airport', type: LocationType.HOTEL, isActive: true, address: '3841 N Lakewood Blvd, Long Beach, CA 90808' },
  { id: 'hotel-16', name: 'Los Angeles Airport Marriott', type: LocationType.HOTEL, isActive: true, address: '5855 W Century Blvd, Los Angeles, CA 90045, USA' },
  { id: 'hotel-17', name: 'Marina Del Rey Marriott', type: LocationType.HOTEL, isActive: true, address: '4100 Admiralty Way, Marina Del Rey, CA 90292' },
  { id: 'hotel-18', name: 'Hilton Garden Inn Dana Point Doheny Beach', type: LocationType.HOTEL, isActive: true, address: '34402 Pacific Coast Hwy, Dana Point, CA 92629' },
  { id: 'hotel-19', name: 'Hotel Indigo Los Angeles Downtown, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '899 Francisco St, Los Angeles, CA 90017' },
  { id: 'hotel-20', name: 'The Westin LAX', type: LocationType.HOTEL, isActive: true, address: '5400 W Century Blvd, Los Angeles, CA 90045, US' },
  { id: 'hotel-21', name: 'Courtyard by Marriott Thousand Oaks Agoura Hills', type: LocationType.HOTEL, isActive: true, address: '29505 Agoura Rd Building B, Agoura Hills, CA 91301' },
  { id: 'hotel-22', name: 'Sheraton Agoura Hills Hotel', type: LocationType.HOTEL, isActive: true, address: '30100 Agoura Rd, Agoura Hills, CA 91301' },
  { id: 'hotel-23', name: 'Irvine Marriott', type: LocationType.HOTEL, isActive: true, address: '18000 Von Karman Ave, Irvine, CA 92612' },
  { id: 'hotel-24', name: 'AC Hotel Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '6399 Wilshire Blvd, Los Angeles, CA 90048' },
  { id: 'hotel-25', name: 'San Diego Marriott Mission Valley', type: LocationType.HOTEL, isActive: true, address: '8757 Rio San Diego Dr, San Diego, CA 92108' },
  { id: 'hotel-26', name: 'Sonesta ES Suites Carmel Mountain San Diego', type: LocationType.HOTEL, isActive: true, address: '11002 Rancho Carmel Dr, San Diego, CA 92128' },
  { id: 'hotel-27', name: 'Holiday Inn Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2725 Palomar Airport Rd, Carlsbad, CA 92009' },
  { id: 'hotel-28', name: 'Staybridge Suites Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2735 Palomar Airport Rd, Carlsbad, CA 92009' },
  { id: 'hotel-29', name: 'Carte Hotel San Diego Downtown, Curio Collection by Hilton', type: LocationType.HOTEL, isActive: true, address: '401 W Ash St, San Diego, CA 92101' },
  { id: 'hotel-30', name: 'Courtyard by Marriott San Diego Downtown Little Italy', type: LocationType.HOTEL, isActive: true, address: '1646 Front St, San Diego, CA 92101' },
  { id: 'hotel-31', name: 'Crowne Plaza San Diego - Mission Valley by IHG', type: LocationType.HOTEL, isActive: true, address: '2270 Hotel Cir N, San Diego, CA 92108' },
  { id: 'hotel-32', name: 'SpringHill Suites by Marriott San Diego Escondido/Downtown', type: LocationType.HOTEL, isActive: true, address: '200 La Terraza Blvd, Escondido, CA 92025' },
  { id: 'hotel-33', name: 'Hampton Inn San Diego/Mission Valley', type: LocationType.HOTEL, isActive: true, address: '2151 Hotel Cir S, San Diego, CA 92108' },
  { id: 'hotel-34', name: 'TownePlace Suites by Marriott San Diego Carlsbad/Vista', type: LocationType.HOTEL, isActive: true, address: '2201 S Melrose Dr, Vista, CA 92081' },
  { id: 'hotel-35', name: 'The Viv Hotel, Anaheim, a Tribute Portfolio Hotel', type: LocationType.HOTEL, isActive: true, address: '1601 S Anaheim Blvd, Anaheim, CA 92805' },
  { id: 'hotel-36', name: 'The Westin South Coast Plaza, Costa Mesa', type: LocationType.HOTEL, isActive: true, address: '686 Anton Blvd, Costa Mesa, CA 92626' },
  { id: 'hotel-37', name: 'Courtyard by Marriott Irvine John Wayne Airport/Orange County', type: LocationType.HOTEL, isActive: true, address: '2701 Main St, Irvine, CA 92614' },
  { id: 'hotel-38', name: 'Le Méridien Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '130 W Huntington Dr, Arcadia, CA 91007' },
  { id: 'hotel-39', name: 'Homewood Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '885 E Hospitality Ln, San Bernardino, CA 92408' },
  { id: 'hotel-40', name: 'Candlewood Suites Loma Linda - San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '10372 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-41', name: 'Holiday Inn Express & Suites Loma Linda- San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '25222 Redlands Blvd, Loma Linda, CA 92354' },
  { id: 'hotel-42', name: 'Four Points by Sheraton Ontario-Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '11960 Foothill Blvd, Rancho Cucamonga, CA 91739' },
  { id: 'hotel-43', name: 'InterContinental Los Angeles Downtown by IHG', type: LocationType.HOTEL, isActive: true, address: '900 Wilshire Blvd, Los Angeles, CA 90017' },
  { id: 'hotel-44', name: 'DoubleTree by Hilton Hotel San Bernardino', type: LocationType.HOTEL, isActive: true, address: '285 E Hospitality Ln, San Bernardino, CA 92408' },
  { id: 'hotel-45', name: 'TownePlace Suites by Marriott San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10336 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-46', name: 'Courtyard San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10354 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-47', name: 'Courtyard by Marriott Thousand Oaks Ventura County', type: LocationType.HOTEL, isActive: true, address: '1710 Newbury Rd, Thousand Oaks, CA 91320' },
  { id: 'hotel-48', name: 'Warner Center Marriott Woodland Hills', type: LocationType.HOTEL, isActive: true, address: '21850 Oxnard St, Woodland Hills, CA 91367' },
  { id: 'hotel-49', name: 'Courtyard by Marriott Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15433 Fairfield Ranch Rd, Chino Hills, CA 91709' },
  { id: 'hotel-50', name: 'Hampton Inn & Suites Moreno Valley', type: LocationType.HOTEL, isActive: true, address: '12611 Memorial Way, Moreno Valley, CA 92553' },
  { id: 'hotel-51', name: 'TownePlace Suites by Marriott Ontario Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15881 Pomona Rincon Rd, Chino Hills, CA 91709' },
  { id: 'hotel-52', name: 'Fairfield by Marriott Inn & Suites San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1041 E, 1041 Harriman Pl, San Bernardino, CA 92408' },
  { id: 'hotel-53', name: 'Residence Inn by Marriott San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1040 Harriman Pl, San Bernardino, CA 92408' },
  { id: 'hotel-54', name: 'Courtyard by Marriott Riverside UCR/Moreno Valley Area', type: LocationType.HOTEL, isActive: true, address: '1510 University Ave, Riverside, CA 92507' },
  { id: 'hotel-55', name: 'Fairfield by Marriott Inn & Suites Riverside Corona/Norco', type: LocationType.HOTEL, isActive: true, address: '3441 Hamner Ave, Norco, CA 92860' },
  { id: 'hotel-56', name: 'SpringHill Suites by Marriott Corona Riverside', type: LocationType.HOTEL, isActive: true, address: '2025 Compton Ave, Corona, CA 92881' },
  { id: 'hotel-57', name: 'DoubleTree by Hilton Hotel San Diego - Mission Valley', type: LocationType.HOTEL, isActive: true, address: '7450 Hazard Center Dr, San Diego, CA 92108' },
  { id: 'hotel-58', name: 'Courtyard by Marriott San Diego Downtown', type: LocationType.HOTEL, isActive: true, address: '530 Broadway, San Diego, CA 92101' },
  { id: 'hotel-59', name: 'SpringHill Suites by Marriott Los Angeles Downey', type: LocationType.HOTEL, isActive: true, address: '9066 Firestone Blvd, Downey, CA 90241' },
  { id: 'hotel-60', name: 'Courtyard by Marriott San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '5835 Owens Ave, Carlsbad, CA 92008' },
  { id: 'hotel-61', name: 'Fairfield by Marriott Inn & Suites San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '1929 Palomar Oaks Way, Carlsbad, CA 92011' },
  { id: 'hotel-62', name: 'Residence Inn by Marriott Ontario Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '9299 Haven Ave, Rancho Cucamonga, CA 91730' },
  { id: 'hotel-63', name: 'Residence Inn by Marriott Los Angeles Torrance/Redondo Beach', type: LocationType.HOTEL, isActive: true, address: '3701 Torrance Blvd, Torrance, CA 90503' },
  { id: 'hotel-64', name: 'Delta Hotels Anaheim Garden Grove', type: LocationType.HOTEL, isActive: true, address: '12021 Harbor Blvd, Garden Grove, CA 92840' },
  { id: 'hotel-65', name: 'SLS Hotel, a Luxury Collection Hotel, Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '465 La Cienega Blvd, Los Angeles, CA 90048' },
  { id: 'hotel-66', name: 'Hilton Anaheim', type: LocationType.HOTEL, isActive: true, address: '777 W Convention Way, Anaheim, CA 92802' },
  { id: 'hotel-67', name: 'Anaheim Suites', type: LocationType.HOTEL, isActive: true, address: '12015 Harbor Blvd, Garden Grove, CA 92840' },
  { id: 'hotel-68', name: 'JW Marriott, Anaheim Resort', type: LocationType.HOTEL, isActive: true, address: '1775 S Clementine St, Anaheim, CA 92802' },
  { id: 'hotel-69', name: 'Residence Inn by Marriott Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '321 E Huntington Dr, Arcadia, CA 91006' },
  { id: 'hotel-70', name: 'DoubleTree by Hilton Hotel Los Angeles - Rosemead', type: LocationType.HOTEL, isActive: true, address: '888 Montebello Blvd, Rosemead, CA 91770' },
  { id: 'hotel-71', name: 'Fairfield Inn Anaheim Hills Orange County', type: LocationType.HOTEL, isActive: true, address: '201 N Via Cortez, Anaheim, CA 92807' },
  { id: 'hotel-72', name: 'Sheraton Los Angeles San Gabriel', type: LocationType.HOTEL, isActive: true, address: '303 E Valley Blvd, San Gabriel, CA 91776' },
  { id: 'hotel-73', name: 'Courtyard by Marriott Los Angeles Baldwin Park', type: LocationType.HOTEL, isActive: true, address: '14635 Baldwin Park Towne Center, Baldwin Park, CA 91706' },
  { id: 'hotel-74', name: 'Fullerton Marriott at California State University', type: LocationType.HOTEL, isActive: true, address: '2701 Nutwood Ave, Fullerton, CA 92831' },
  { id: 'hotel-75', name: 'Residence Inn by Marriott Santa Clarita Valencia', type: LocationType.HOTEL, isActive: true, address: '25320 the Old Rd, Stevenson Ranch, CA, 91381' },
  { id: 'hotel-76', name: 'TownePlace Suites by Marriott Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '9625 Milliken Ave, Rancho Cucamonga, CA 91730' },
  { id: 'hotel-77', name: 'Home2 Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '837 E Brier Dr, San Bernardino, CA 92408' },
  { id: 'hotel-78', name: 'DoubleTree by Hilton Los Angeles – Norwalk', type: LocationType.HOTEL, isActive: true, address: '13111 Sycamore Dr, Norwalk, CA 90650' },
  { id: 'hotel-79', name: 'Delta Hotels Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '2200 E Holt Blvd, Ontario, CA 91761' },
  { id: 'hotel-80', name: 'Holiday Inn la Mirada – Buena Park by IHG', type: LocationType.HOTEL, isActive: true, address: '14299 Firestone Blvd, La Mirada, CA 90638' },
  { id: 'hotel-81', name: 'Residence Inn by Marriott Palmdale Lancaster', type: LocationType.HOTEL, isActive: true, address: '847 West Lancaster Boulevard, Lancaster, CA, 93534' },
  { id: 'hotel-82', name: 'Sonesta ES Suites San Diego - Sorrento Mesa', type: LocationType.HOTEL, isActive: true, address: '6639 Mira Mesa Blvd, San Diego, CA 92121' },
  { id: 'hotel-83', name: 'Courtyard by Marriott Costa Mesa South Coast Metro', type: LocationType.HOTEL, isActive: true, address: '3002 S Harbor Blvd, Santa Ana, CA 92704' },
  { id: 'hotel-84', name: 'DoubleTree by Hilton Whittier Los Angeles', type: LocationType.HOTEL, isActive: true, address: '7320 Greenleaf Ave, Whittier, CA 90602' },
  { id: 'hotel-85', name: 'Residence Inn by Marriott Cypress Los Alamitos', type: LocationType.HOTEL, isActive: true, address: '4931 Katella Ave, Los Alamitos, CA 90720' },
  { id: 'hotel-86', name: 'Sheraton Cerritos Hotel', type: LocationType.HOTEL, isActive: true, address: '12725 Center Ct Dr S, Cerritos, CA 90703' },
  { id: 'hotel-87', name: 'Courtyard by Marriott San Diego Mission Valley/Hotel Circle', type: LocationType.HOTEL, isActive: true, address: '595 Hotel Cir S, San Diego, CA 92108' },
  { id: 'hotel-88', name: 'Courtyard by Marriott Victorville Hesperia', type: LocationType.HOTEL, isActive: true, address: '9619 Mariposa Rd, Hesperia, CA 92345' },
  { id: 'hotel-89', name: 'Sonesta ES Suites San Diego - Rancho Bernardo', type: LocationType.HOTEL, isActive: true, address: '11855 Avenue of Industry, San Diego, CA, 92128' },
  { id: 'hotel-90', name: 'Embassy Suites by Hilton Temecula Valley Wine Country', type: LocationType.HOTEL, isActive: true, address: '29345 Rancho California Rd, Temecula, CA 92591' },
  
  // Worksites (Updated)
  { id: 'ws-1', name: 'Downey MC', type: LocationType.WORKSITE, isActive: true, address: '9333 Imperial Hwy. Downey CA 90242' },
  { id: 'ws-2', name: 'Panorama City MC', type: LocationType.WORKSITE, isActive: true, address: '8120 Woodman Ave, Panorama City, CA 91402' },
  { id: 'ws-3', name: 'LAMC Mental Health Center', type: LocationType.WORKSITE, isActive: true, address: '765 W College St, Los Angeles, CA 90012' },
  { id: 'ws-4', name: 'Irvine MC', type: LocationType.WORKSITE, isActive: true, address: '6650 Alton Parkway. Irvine, CA 92618' },
  { id: 'ws-5', name: 'Carson Medical Office', type: LocationType.WORKSITE, isActive: true, address: '18600 S. Figueroa Street, Gardena CA 90248' },
  { id: 'ws-6', name: 'Porter Ranch MOB Family Medicine', type: LocationType.WORKSITE, isActive: true, address: '20000 Rinaldi St, Porter Ranch, CA 91326' },
  { id: 'ws-7', name: 'Ontario Medical Center MOB A & D', type: LocationType.WORKSITE, isActive: true, address: '2295 S. Vineyard Ave Ontario, CA 91761' },
  { id: 'ws-8', name: 'Stockdale Urgent Care', type: LocationType.WORKSITE, isActive: true, address: '9900 Stockdale Hwy, Suite 105, Bakersfield, CA 93311' },
  { id: 'ws-9', name: 'West LA MC', type: LocationType.WORKSITE, isActive: true, address: '6041 Cadillac Avenue, Los Angeles, CA 90034' },
  { id: 'ws-10', name: 'Woodland Hills MC', type: LocationType.WORKSITE, isActive: true, address: '5601 De Soto, Woodland Hills, Ca 91367' },
  { id: 'ws-11', name: 'Normandie North Medical Offices', type: LocationType.WORKSITE, isActive: true, address: '25965 S. Normandie Ave., Harbor City, CA 90710' },
  { id: 'ws-12', name: 'MVJ Medical Office', type: LocationType.WORKSITE, isActive: true, address: '23781 Maquina Avenue, Mission Viejo, CA 92691' },
  { id: 'ws-13', name: 'San Diego Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9455 Clairemont Mesa Blvd, San Diego, CA 92123' },
  { id: 'ws-14', name: 'Chester I MOB', type: LocationType.WORKSITE, isActive: true, address: '2531 Chester Ave, Bakersfield, CA 93301' },
  { id: 'ws-15', name: 'Zion Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4647 Zion Ave, San Diego, CA 92120' },
  { id: 'ws-16', name: 'San Marcos Medical Center', type: LocationType.WORKSITE, isActive: true, address: '360 Rush Drive, San Marcos, CA 92078' },
  { id: 'ws-17', name: 'HBM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '3401 S. Harbor Blvd., Santa Ana, CA 92704' },
  { id: 'ws-18', name: 'Downey MC - Orchard MOB', type: LocationType.WORKSITE, isActive: true, address: '9449 Imperial Hwy Downey CA 90242' },
  { id: 'ws-19', name: 'FPL Med Office', type: LocationType.WORKSITE, isActive: true, address: '3280 E Foothill Blvd, Los Angeles, CA 90022' },
  { id: 'ws-20', name: 'LAMC', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-21', name: 'Fontana Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave., Fontana, CA 92335' },
  { id: 'ws-22', name: 'Los Angeles Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-23', name: 'FMC MOB 1& 2, MOB 3', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave Fontana, CA 92335' },
  { id: 'ws-24', name: 'KP-4700 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4700 Sunset Blvd, LA 90027' },
  { id: 'ws-25', name: 'Market Street MOB', type: LocationType.WORKSITE, isActive: true, address: '4949 Market St, Ventura, CA 93003' },
  { id: 'ws-26', name: 'Riverside Medical Center MOB', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave Riverside, CA. 92505' },
  { id: 'ws-27', name: 'Riverside MC', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave, Riverside, CA 92505' },
  { id: 'ws-28', name: 'Baldwin Park MC', type: LocationType.WORKSITE, isActive: true, address: '1011 Baldwin Park Blvd., Baldwin Park, Ca 91706' },
  { id: 'ws-29', name: 'OTM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '4650 Palm Ave. San Diego, CA 92154' },
  { id: 'ws-30', name: 'Downey MC- Garden MOB', type: LocationType.WORKSITE, isActive: true, address: '9353 Imperial Hwy Downey CA 90242' },
  { id: 'ws-31', name: 'South Bay MC', type: LocationType.WORKSITE, isActive: true, address: '25825 S. Vermont Ave, Harbor City CA 90710' },
  { id: 'ws-32', name: 'Ontario Medical Center', type: LocationType.WORKSITE, isActive: true, address: '2295 South Vineyard, Ontario, CA 91761' },
  { id: 'ws-33', name: 'Stockdale', type: LocationType.WORKSITE, isActive: true, address: '3501 Stockdale Hwy, Bakersfield, CA 93309' },
  { id: 'ws-34', name: 'Coastline Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '25821 S. Vermont Ave. Harbor City, CA 90710' },
  { id: 'ws-35', name: 'Kraemer Medical Office 2', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, California 92806' },
  { id: 'ws-36', name: 'Baldwin Hills Crenshaw Med Office', type: LocationType.WORKSITE, isActive: true, address: '3782 W Martin Luther King Jr. Boulevard, Los Angeles CA 90008' },
  { id: 'ws-37', name: 'Anaheim MC', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, CA 92806' },
  { id: 'ws-38', name: 'Center of Healthy Living', type: LocationType.WORKSITE, isActive: true, address: '74 N Pasadena, Avenue, Pasadena, CA 8th Floor, Pasadena, California 91101' },
  { id: 'ws-39', name: 'Pharmacy Central Order', type: LocationType.WORKSITE, isActive: true, address: '12254 Bellflower Blvd, Downey, California 90242' },
  { id: 'ws-40', name: 'Panorama City-Main Campus (MO2, MO3, MO4, MO5, MO6)', type: LocationType.WORKSITE, isActive: true, address: '13652 Cantara Street Panorama City, CA 91402' },
  { id: 'ws-41', name: 'VMC Clinical', type: LocationType.WORKSITE, isActive: true, address: '17284 Slover Ave, Fontana, CA 92337' },
  { id: 'ws-42', name: 'Bellflower MOB', type: LocationType.WORKSITE, isActive: true, address: '9400 Rosecrans Ave. Bellflower, CA 90706' },
  { id: 'ws-43', name: 'San Marcos MOB', type: LocationType.WORKSITE, isActive: true, address: '400 Craven Rd, San Marcos, CA 92078' },
  { id: 'ws-44', name: 'Vandever MOB', type: LocationType.WORKSITE, isActive: true, address: '4405 Vandever Av, San Diego, CA 92120' },
  { id: 'ws-45', name: 'LAN Mob', type: LocationType.WORKSITE, isActive: true, address: '43112 15th Street West, Lancaster 93534' },
  { id: 'ws-46', name: 'Pharmacy Mail Order Pharm and Tech', type: LocationType.WORKSITE, isActive: true, address: '9521 Dalen Street, Downey, CA 90242' },
  { id: 'ws-47', name: 'EMO Medical Office', type: LocationType.WORKSITE, isActive: true, address: '1188 N. Euclid Street, Anaheim, CA 92801' },
  { id: 'ws-48', name: 'GG Medical Office', type: LocationType.WORKSITE, isActive: true, address: '12100 Euclid Street, Garden Grove, CA 92840' },
  { id: 'ws-49', name: 'High Desert MOB', type: LocationType.WORKSITE, isActive: true, address: '14011 Park Ave Victorville, CA 92392' },
  { id: 'ws-50', name: 'KP-4900 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4900 Sunset Blvd, LA 90027' },
  { id: 'ws-51', name: 'Regional L&D Advice Nurse', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-52', name: 'KP-4950 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4950 Sunset Blvd, Los Angeles 90027' },
  { id: 'ws-53', name: 'Murrieta Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '28150 Keller Road Murrieta, CA 92563' },
  { id: 'ws-54', name: 'Santa Clarita MOB 2', type: LocationType.WORKSITE, isActive: true, address: '26877 Tourney Rd, Santa Clarita, CA 91355' },
];

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
  // if not already set.
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
    currentLocationId
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
    // Note: This toggle only works for boolean permissions. allowedLocationIds is handled separately.
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

export const updateUserAssignedWorksite = (userId: string, worksiteId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].assignedWorksiteId = worksiteId;
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
EOF

echo "Writing services/geminiService.ts..."
cat << 'EOF' > services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { LogEntry, Location } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeLogs = async (logs: LogEntry[], locations: Location[]) => {
  const ai = getClient();
  if (!ai) return "API Key not configured.";

  // Format data for the model to digest easily
  const recentLogs = logs.slice(-50); // Analyze last 50 logs to avoid token limits in this demo
  const logSummary = JSON.stringify(recentLogs.map(l => ({
    route: l.routeType,
    driver: l.driverName,
    passengers: l.passengerCount,
    company: l.companyName,
    time: new Date(l.timestamp).toLocaleTimeString(),
    date: new Date(l.timestamp).toLocaleDateString(),
    eta: l.eta
  })));

  const locationSummary = JSON.stringify(locations);

  const prompt = `
    You are an operations analyst for a charter bus company. 
    Here is a list of recent trip logs: ${logSummary}
    Here are the locations: ${locationSummary}

    Please provide a concise, professional daily briefing for the Admin.
    1. Summarize the total passenger volume.
    2. Identify any busy drivers or companies.
    3. Point out any potential anomalies or efficiency observations.
    4. Keep it under 150 words.
    5. Format with clear bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate analysis at this time. Please check API configuration.";
  }
};
EOF

echo "Project reconstructed successfully!"
