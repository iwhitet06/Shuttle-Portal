import React, { useState, useEffect } from 'react';
import { AppData, User, UserRole, LocationType } from '../types';
import { sendMessage, markMessagesAsRead, updateUserAssignedWorksite } from '../services/supabaseService';
import { Send, User as UserIcon, Briefcase, BadgeCheck, Plus, X } from 'lucide-react';
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
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  // Update selected user if the prop changes (e.g. navigation from search)
  useEffect(() => {
    if (initialSelectedUserId) {
      handleSelectUser(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  const handleSelectUser = async (id: string) => {
      setSelectedUserId(id);
      setIsNewChatOpen(false);
      setNewChatSearch('');
      await markMessagesAsRead(id, currentUser.id); // Mark messages from sender to me as read
      refreshData();
  };

  const handleWorksiteChange = async (val: string) => {
    await updateUserAssignedWorksite(currentUser.id, val);
    refreshData();
  };

  // Get active worksites for the dropdown
  const allowedIds = currentUser.permissions.allowedLocationIds;
  const activeWorksites = data.locations.filter(l => {
     if (!l.isActive) return false;
     if (l.type !== LocationType.WORKSITE) return false;
     if (!allowedIds || allowedIds.length === 0) return true;
     return allowedIds.includes(l.id);
  });

  // Calculate active conversations (Filter)
  const existingConversationUserIds = new Set<string>();
  data.messages.forEach(m => {
      if (m.fromUserId === currentUser.id) existingConversationUserIds.add(m.toUserId);
      if (m.toUserId === currentUser.id) existingConversationUserIds.add(m.fromUserId);
  });

  // Base list of users to display in sidebar
  const allUsers = data.users
    .filter(u => u.id !== currentUser.id && u.status === 'ACTIVE')
    .map(u => {
        const msgs = data.messages.filter(m => 
            (m.fromUserId === currentUser.id && m.toUserId === u.id) ||
            (m.fromUserId === u.id && m.toUserId === currentUser.id)
        ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first

        const lastMsg = msgs[0];
        const unreadCount = msgs.filter(m => m.fromUserId === u.id && m.toUserId === currentUser.id && !m.isRead).length;

        // Check if this user is a coordinator for my assigned worksite
        const isCoordinator = 
            currentUser.assignedWorksiteId && 
            (u.role === UserRole.ADMIN || u.role === UserRole.ONSITE_COORDINATOR) && 
            u.currentLocationId === currentUser.assignedWorksiteId;

        // Determine if user should show in sidebar:
        // 1. Is Coordinator (Always show important contact)
        // 2. Has existing conversation
        const shouldShow = isCoordinator || existingConversationUserIds.has(u.id);

        return {
            user: u,
            lastMsgTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
            unreadCount,
            isCoordinator,
            shouldShow
        };
    });

  // Filter for display
  const displayUsers = allUsers.filter(u => u.shouldShow).sort((a, b) => {
      // Coordinators first, then by recent message
      if (a.isCoordinator && !b.isCoordinator) return -1;
      if (!a.isCoordinator && b.isCoordinator) return 1;
      return b.lastMsgTime - a.lastMsgTime;
  });

  // Filter messages for selected conversation
  const conversation = selectedUserId 
    ? data.messages.filter(m => 
        (m.fromUserId === currentUser.id && m.toUserId === selectedUserId) ||
        (m.fromUserId === selectedUserId && m.toUserId === currentUser.id)
      ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !msgContent.trim()) return;
    await sendMessage(currentUser.id, selectedUserId, msgContent);
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
                <div className="text-xs text-slate-500 uppercase">{user.role.replace('_', ' ')}</div>
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

  // New Chat Selection List
  const potentialNewChatUsers = data.users
    .filter(u => u.id !== currentUser.id && u.status === 'ACTIVE')
    .filter(u => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        return fullName.includes(newChatSearch.toLowerCase());
    });

  return (
    <div className="h-[calc(100vh-100px)] max-w-6xl mx-auto flex flex-col md:flex-row bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`md:w-1/3 border-r border-slate-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Worksite Selector Box */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Briefcase size={12} /> My Assigned Worksite
            </label>
            <SearchableDropdown 
                options={activeWorksites} 
                value={currentUser.assignedWorksiteId || ''} 
                onChange={handleWorksiteChange} 
                placeholder="Select your worksite..."
                compact={true}
            />
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Select your worksite to find your coordinator.
            </p>
        </div>

        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Chats</h3>
          <button 
            onClick={() => setIsNewChatOpen(true)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded-full transition"
            title="New Chat"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {displayUsers.length > 0 ? (
             displayUsers.map(item => renderUserItem(item))
          ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                  No active chats. Start a new one!
              </div>
          )}

          {/* New Chat Modal/Overlay */}
          {isNewChatOpen && (
            <div className="absolute inset-0 bg-white z-20 flex flex-col animate-fadeIn">
                <div className="p-3 border-b border-slate-200 flex items-center gap-2">
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Search users..."
                        className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newChatSearch}
                        onChange={e => setNewChatSearch(e.target.value)}
                    />
                    <button onClick={() => setIsNewChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {potentialNewChatUsers.map(u => (
                        <button
                            key={u.id}
                            onClick={() => handleSelectUser(u.id)}
                            className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 flex items-center gap-3"
                        >
                            <div className="bg-slate-200 p-2 rounded-full text-slate-500">
                                <UserIcon size={16} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 text-sm">{u.firstName} {u.lastName}</div>
                                <div className="text-xs text-slate-500">{u.role.replace('_', ' ')}</div>
                            </div>
                        </button>
                    ))}
                </div>
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
                {(!currentUser.assignedWorksiteId) && (
                    <p className="text-xs text-orange-500 mt-2">
                        Tip: Select your worksite to find your coordinator.
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
                             {allUsers.find(item => item.user.id === selectedUserId)?.isCoordinator 
                                ? 'On-site Coordinator' 
                                : allUsers.find(item => item.user.id === selectedUserId)?.user.role.replace('_', ' ')}
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