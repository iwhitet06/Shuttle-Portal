
import React, { useState, useEffect, useRef } from 'react';
import { User, AppData, UserStatus, UserRole, RouteType } from './types';
import { loadData, cleanupStaleTrips, updateUserProfile } from './services/supabaseService';
import { LoginScreen } from './components/LoginScreen';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MessagingView } from './components/MessagingView';
import { LayoutDashboard, MessageSquare, LogOut, Clock, Shield, Bus, Settings, Search, X, User as UserIcon, Calendar, MapPin, Loader2, Sun, Moon } from 'lucide-react';

const SESSION_KEY = 'shuttle_portal_session_v1';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [view, setView] = useState<'LOG_TRIPS' | 'MESSAGES' | 'ADMIN_CONSOLE'>('LOG_TRIPS');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved as 'light' | 'dark';
    }
    return 'light';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchData = async (isInitialLoad: boolean = false): Promise<AppData | null> => {
    try {
      const fetchedData = await loadData();
      setData(fetchedData);
      
      if (isInitialLoad) {
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
          const user = fetchedData.users.find(u => u.id === savedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
        setIsRestoringSession(false);
      } else if (currentUser) {
        const updatedUser = fetchedData.users.find(u => u.id === currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        } else {
          handleLogout();
        }
      }
      return fetchedData;
    } catch (error) {
      console.error("Failed to load data", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await cleanupStaleTrips();
      fetchData(true);
    };
    init();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

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

  const handleLogin = (user: User) => {
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);
  };

  const handleUpdateProfile = async (updates: { currentLocationId?: string, assignedWorksiteIds?: string[] }) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser };
      if (updates.currentLocationId !== undefined) updatedUser.currentLocationId = updates.currentLocationId;
      if (updates.assignedWorksiteIds !== undefined) updatedUser.assignedWorksiteIds = updates.assignedWorksiteIds;
      setCurrentUser(updatedUser);
      try {
        await updateUserProfile(currentUser.id, updates);
        await fetchData();
      } catch (e) {
        console.error("Failed to save profile", e);
      }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setView('LOG_TRIPS');
    setSearchQuery('');
    setTargetUserId(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  if (isRestoringSession || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          {isRestoringSession ? 'Restoring session...' : 'Connecting to Shuttle System...'}
        </p>
      </div>
    );
  }

  if (!data) return null;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const getLocationName = (id: string) => data.locations.find(l => l.id === id)?.name || 'Unknown';
  const unreadCount = currentUser ? data.messages.filter(m => m.toUserId === currentUser.id && !m.isRead).length : 0;

  const filteredLogs = searchQuery ? data.logs.filter(l => {
    const depName = getLocationName(l.departLocationId).toLowerCase();
    const arrName = getLocationName(l.arrivalLocationId).toLowerCase();
    const q = searchQuery.toLowerCase();
    return l.driverName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q) || l.busNumber.toLowerCase().includes(q) || depName.includes(q) || arrName.includes(q);
  }).slice(0, 5) : [];

  const filteredUsers = searchQuery ? data.users.filter(u => {
    const nameMatch = (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch;
  }).slice(0, 5) : [];

  const navigateToMessage = (userId: string) => {
    setTargetUserId(userId);
    setView('MESSAGES');
    clearSearch();
  };

  if (currentUser.status === UserStatus.PENDING) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Pending</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Hi {currentUser.firstName}, your account is currently awaiting administrator approval.</p>
          <button onClick={handleLogout} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Back to Login</button>
        </div>
      </div>
    );
  }

  if (currentUser.status === UserStatus.REVOKED) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Revoked</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Your access to this platform has been revoked by an administrator.</p>
          <button onClick={handleLogout} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Back to Login</button>
        </div>
      </div>
    );
  }

  const canAccessAdminConsole = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-20 md:pb-0">
      <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-shrink-0">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-500 tracking-tight flex items-center gap-2">
                <Bus className="w-6 h-6" />
                <span className="hidden sm:inline">Shuttle Portal</span>
                <span className="sm:hidden">SP</span>
              </span>
            </div>
            <div className="hidden md:flex space-x-8 mx-4">
               <button onClick={() => { setView('LOG_TRIPS'); setTargetUserId(null); }} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${view === 'LOG_TRIPS' ? 'border-blue-500 text-gray-900 dark:text-slate-50' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300'}`}>Log Trips</button>
               <button onClick={() => setView('MESSAGES')} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition relative ${view === 'MESSAGES' ? 'border-blue-500 text-gray-900 dark:text-slate-50' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300'}`}>
                 Messages
                 {unreadCount > 0 && <span className="absolute top-1 -right-2 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 bg-blue-600"></span>}
               </button>
               {canAccessAdminConsole && <button onClick={() => { setView('ADMIN_CONSOLE'); setTargetUserId(null); }} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${view === 'ADMIN_CONSOLE' ? 'border-blue-500 text-gray-900 dark:text-slate-50' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300'}`}>Admin Console</button>}
            </div>
            <div className="flex items-center justify-end flex-1 gap-2 sm:gap-4 ml-8">
              <div className="relative max-w-xs w-full" ref={searchRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                  <input type="text" className="block w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-full leading-5 bg-slate-50 dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm transition text-slate-900 dark:text-slate-50 text-center focus:text-left" placeholder="Search" value={searchQuery} onChange={handleSearch} />
                  {searchQuery && <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
                </div>
                {isSearchOpen && searchQuery && (
                  <div className="absolute top-full mt-2 w-full sm:w-80 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 overflow-hidden">
                    {filteredUsers.length === 0 && filteredLogs.length === 0 && <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">No results found.</div>}
                    {filteredUsers.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/50">Users</div>
                        {filteredUsers.map(user => (
                          <button key={user.id} onClick={() => navigateToMessage(user.id)} className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition flex items-center space-x-3">
                            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full"><UserIcon size={16} className="text-slate-500 dark:text-slate-400" /></div>
                            <div><div className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.firstName} {user.lastName}</div></div>
                          </button>
                        ))}
                      </div>
                    )}
                    {filteredLogs.length > 0 && (
                      <div>
                        <div className="px-4 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/50 mt-1">Logs</div>
                        {filteredLogs.map(log => (
                          <div key={log.id} className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                            <div className="flex items-center justify-between mb-1"><div className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.companyName}</div><div className="text-xs bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Bus {log.busNumber}</div></div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 flex flex-col gap-0.5"><span className="flex items-center gap-1"><MapPin size={10} /> {getLocationName(log.departLocationId)} → {getLocationName(log.arrivalLocationId)}</span><span className="flex items-center gap-1"><Calendar size={10} /> {new Date(log.timestamp).toLocaleDateString()}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition" title="Toggle Theme">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition" title="Logout"><LogOut size={20} /></button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-6">
        {view === 'LOG_TRIPS' && <AgentDashboard data={data} currentUser={currentUser} refreshData={fetchData} onUpdateProfile={handleUpdateProfile} />}
        {view === 'MESSAGES' && <MessagingView data={data} currentUser={currentUser} refreshData={fetchData} initialSelectedUserId={targetUserId} onClearTarget={() => setTargetUserId(null)} onUpdateProfile={handleUpdateProfile} />}
        {view === 'ADMIN_CONSOLE' && canAccessAdminConsole && <AdminDashboard data={data} refreshData={fetchData} currentUser={currentUser} theme={theme} />}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 flex justify-around p-3 md:hidden z-50">
        <button onClick={() => { setView('LOG_TRIPS'); setTargetUserId(null); }} className={`flex flex-col items-center space-y-1 transition ${view === 'LOG_TRIPS' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}><LayoutDashboard size={24} /><span className="text-[10px] font-medium">Log Trips</span></button>
        <button onClick={() => setView('MESSAGES')} className={`flex flex-col items-center space-y-1 relative transition ${view === 'MESSAGES' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}><div className="relative"><MessageSquare size={24} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 bg-blue-600"></span>}</div><span className="text-[10px] font-medium">Messages</span></button>
        {canAccessAdminConsole && <button onClick={() => { setView('ADMIN_CONSOLE'); setTargetUserId(null); }} className={`flex flex-col items-center space-y-1 transition ${view === 'ADMIN_CONSOLE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}><Settings size={24} /><span className="text-[10px] font-medium">Admin</span></button>}
      </div>
    </div>
  );
};

export default App;
