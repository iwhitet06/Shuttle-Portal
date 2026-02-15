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
    const newData = loadData();
    setData(newData);
    
    // Also update current user object if their status changed remotely
    if (currentUser) {
        const updatedUser = newData.users.find(u => u.id === currentUser.id);
        if (updatedUser) {
            setCurrentUser(updatedUser);
        } else {
            // Security fallback: User was removed from DB (e.g. wiped or race condition overwrite)
            // Force logout to prevent "ghost" sessions where user is logged in but invisible to admin
            setCurrentUser(null);
            setView('LOG_TRIPS');
        }
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