import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppData, User, UserRole, LocationType, Group } from '../types';
import { sendMessage, markMessagesAsRead, createGroup, leaveGroup } from '../services/supabaseService';
import { Send, User as UserIcon, Briefcase, Plus, X, Users as UsersIcon, MessageSquare, MapPin, Search, Loader2, ChevronLeft, Info, LogOut } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';

interface MessagingViewProps {
  data: AppData;
  currentUser: User;
  refreshData: () => void;
  initialSelectedUserId?: string | null;
  onUpdateProfile: (updates: { currentLocationId?: string, assignedWorksiteIds?: string[] }) => Promise<void>;
}

// WhatsApp-style color palette for participant names
const NAME_COLORS = [
  'text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 
  'text-pink-600', 'text-indigo-600', 'text-teal-600', 'text-red-600'
];

const getNameColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
};

export const MessagingView: React.FC<MessagingViewProps> = ({ data, currentUser, refreshData, initialSelectedUserId, onUpdateProfile }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedUserId || null);
  const [msgContent, setMsgContent] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChatId, data.messages]);

  useEffect(() => {
    if (initialSelectedUserId) setSelectedChatId(initialSelectedUserId);
  }, [initialSelectedUserId]);

  const handleSelectChat = async (id: string) => {
      setSelectedChatId(id);
      setIsNewChatOpen(false);
      setIsGroupInfoOpen(false);
      
      const isGroup = data.groups?.some(g => g.id === id);
      if (!isGroup) {
          try {
            await markMessagesAsRead(id, currentUser.id); 
          } catch (e) {
            console.error("Read receipt failed", e);
          }
      }
      refreshData();
  };

  const handleWorksiteChange = async (val: any) => {
    const newIds = Array.isArray(val) ? val : [val];
    await onUpdateProfile({ assignedWorksiteIds: newIds });
  };

  const handleLocationChange = async (val: string) => {
    await onUpdateProfile({ currentLocationId: val });
  };

  const handleLeaveGroup = async () => {
    if (!selectedChatId) return;
    if (window.confirm('Are you sure you want to leave this group?')) {
        await leaveGroup(selectedChatId, currentUser.id);
        setSelectedChatId(null);
        setIsGroupInfoOpen(false);
        refreshData();
    }
  };

  const myGroups = useMemo(() => (data.groups || []).filter(g => g.memberIds.includes(currentUser.id)), [data.groups, currentUser.id]);
  const validUsers = useMemo(() => data.users.filter(u => u.id !== currentUser.id && u.status === 'ACTIVE' && u.phone !== '000-000-0000'), [data.users, currentUser.id]);

  const displayItems = useMemo(() => {
    const allUsers = validUsers.map(u => {
        const msgs = data.messages.filter(m => !m.groupId && ((m.fromUserId === currentUser.id && m.toUserId === u.id) || (m.fromUserId === u.id && m.toUserId === currentUser.id))).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const lastMsg = msgs[0];
        const unreadCount = msgs.filter(m => m.fromUserId === u.id && m.toUserId === currentUser.id && !m.isRead).length;
        return { 
            type: 'USER', 
            id: u.id, 
            name: `${u.firstName} ${u.lastName}`, 
            role: u.role, 
            lastMsgTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0, 
            unreadCount, 
            shouldShow: true 
        };
    });

    const groupItems = myGroups.map(g => {
        const msgs = data.messages.filter(m => m.groupId === g.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return { 
            type: 'GROUP', 
            id: g.id, 
            name: g.name, 
            role: 'Group', 
            lastMsgTime: msgs[0] ? new Date(msgs[0].timestamp).getTime() : 0, 
            unreadCount: 0, 
            shouldShow: true 
        };
    });

    return [...allUsers, ...groupItems].sort((a, b) => b.lastMsgTime - a.lastMsgTime);
  }, [validUsers, data.messages, currentUser.id, myGroups]);

  const selectedGroup = useMemo(() => myGroups.find(g => g.id === selectedChatId), [myGroups, selectedChatId]);
  const selectedUser = useMemo(() => !selectedGroup ? data.users.find(u => u.id === selectedChatId) : null, [data.users, selectedChatId, selectedGroup]);
  
  const conversation = useMemo(() => {
      if (!selectedChatId) return [];
      return data.messages.filter(m => 
          selectedGroup ? m.groupId === selectedChatId : !m.groupId && ((m.fromUserId === currentUser.id && m.toUserId === selectedChatId) || (m.fromUserId === selectedChatId && m.toUserId === currentUser.id))
      ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedChatId, selectedGroup, data.messages, currentUser.id]);

  const groupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.memberIds.map(id => data.users.find(u => u.id === id)).filter(Boolean) as User[];
  }, [selectedGroup, data.users]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !msgContent.trim()) return;
    const content = msgContent.trim();
    setMsgContent('');
    await sendMessage(currentUser.id, selectedChatId, content, !!selectedGroup);
    refreshData();
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[64px] flex flex-col md:static md:h-[calc(100vh-120px)] md:max-w-6xl md:mx-auto bg-white dark:bg-slate-800 md:rounded-2xl md:shadow-xl border-t md:border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-72 border-r border-slate-200 dark:border-slate-700 flex flex-col relative ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1.5 px-1 tracking-wider"><MapPin size={10} /> My Station</label>
                <SearchableDropdown options={data.locations.filter(l => l.isActive)} value={currentUser.currentLocationId || ''} onChange={handleLocationChange} placeholder="Set Station" compact={true} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1.5 px-1 tracking-wider"><Briefcase size={10} /> Assigned Targets</label>
                <SearchableDropdown options={data.locations.filter(l => l.isActive && l.type === LocationType.WORKSITE)} value={isAdmin ? currentUser.assignedWorksiteIds || [] : (currentUser.assignedWorksiteIds?.[0] || '')} onChange={handleWorksiteChange} placeholder="Set Target" compact={true} multiple={isAdmin} />
              </div>
          </div>
          
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Chats</h3>
              <button onClick={() => setIsNewChatOpen(true)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"><Search size={18} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 no-scrollbar">
              {displayItems.length > 0 ? displayItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => handleSelectChat(item.id)} 
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/30 transition-all flex items-center gap-3 ${selectedChatId === item.id ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${item.type === 'GROUP' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {item.type === 'GROUP' ? <UsersIcon size={20} /> : <UserIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{item.name}</div>
                      {item.lastMsgTime > 0 && <span className="text-[10px] text-slate-400 font-medium">{new Date(item.lastMsgTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate tracking-tight">{item.role}</div>
                  </div>
                  {item.unreadCount > 0 && <div className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ml-1">{item.unreadCount}</div>}
                </button>
              )) : (
                  <div className="p-12 text-center text-slate-400 text-sm">No chats yet</div>
              )}
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {!selectedChatId ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                  <div className="text-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare size={36} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-medium">Select a teammate to start chatting</p>
                  </div>
              </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden relative">
              {/* STUCK HEADER - WhatsApp Style */}
              <div className="flex-shrink-0 h-14 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md z-10 cursor-pointer" onClick={() => selectedGroup && setIsGroupInfoOpen(true)}>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedChatId(null); }} className="md:hidden p-1.5 -ml-1 text-blue-600 transition">
                      <ChevronLeft size={24} />
                  </button>
                  <div className="flex items-center gap-3 ml-1 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${selectedGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {selectedGroup ? <UsersIcon size={18} /> : <UserIcon size={18} />}
                      </div>
                      <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm leading-tight">
                              {selectedGroup ? selectedGroup.name : (selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Loading...')}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                              {selectedGroup ? `${selectedGroup.memberIds.length} members • Tap for info` : (selectedUser?.role || 'Dispatcher')}
                          </div>
                      </div>
                  </div>
                  {selectedGroup && <Info size={18} className="text-blue-600 ml-2" />}
              </div>

              {/* SCROLLABLE MESSAGE LIST - Compact WhatsApp Style */}
              <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar"
              >
                  {conversation.length === 0 && (
                    <div className="h-full flex items-center justify-center py-10 opacity-50">
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">Safe Environment</span>
                    </div>
                  )}
                  {conversation.map((msg, idx) => { 
                      const isMe = msg.fromUserId === currentUser.id; 
                      const sender = selectedGroup && !isMe ? data.users.find(u => u.id === msg.fromUserId) : null;
                      const showSenderName = selectedGroup && !isMe && (idx === 0 || conversation[idx-1].fromUserId !== msg.fromUserId);
                      
                      return ( 
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fadeIn`}>
                              <div className={`max-w-[85%] md:max-w-[70%] px-2.5 py-1.5 rounded-lg shadow-sm text-[13.5px] leading-[1.3] relative ${
                                  isMe 
                                  ? 'bg-[#DCF8C6] dark:bg-blue-800 text-slate-900 dark:text-slate-100' 
                                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              }`}>
                                  {showSenderName && (
                                    <div className={`text-[11px] font-bold mb-0.5 ${getNameColor(msg.fromUserId)}`}>
                                      {sender?.firstName} {sender?.lastName}
                                    </div>
                                  )}
                                  <div className="inline-block pr-10">{msg.content}</div>
                                  <div className={`text-[9px] font-medium absolute bottom-1 right-1.5 opacity-50 ${isMe ? 'text-green-800 dark:text-blue-100' : 'text-slate-400'}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                          </div> 
                      ); 
                  })}
              </div>

              {/* STUCK INPUT BAR - iOS Style */}
              <div className="flex-shrink-0 bg-white/95 dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-700 p-2 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-3">
                  <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto items-end">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center px-1">
                          <textarea 
                              rows={1}
                              value={msgContent} 
                              onChange={e => setMsgContent(e.target.value)} 
                              placeholder="Message" 
                              className="flex-1 bg-transparent border-none py-2 px-3 focus:ring-0 outline-none text-slate-900 dark:text-slate-100 text-base font-medium resize-none max-h-32" 
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSend(e as any);
                                  }
                              }}
                          />
                      </div>
                      <button 
                          type="submit" 
                          disabled={!msgContent.trim()} 
                          className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-full disabled:opacity-40 transition-all flex items-center justify-center flex-shrink-0"
                      >
                          <Send size={18} strokeWidth={2.5} className="ml-0.5" />
                      </button>
                  </form>
              </div>

              {/* GROUP INFO OVERLAY (iOS Style) */}
              {isGroupInfoOpen && selectedGroup && (
                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col animate-slideInRight">
                    <div className="h-14 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between sticky top-0 z-10">
                        <button onClick={() => setIsGroupInfoOpen(false)} className="text-blue-600 flex items-center gap-1 font-medium">
                            <ChevronLeft size={24} className="-ml-1" /> Back
                        </button>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">Group Info</h4>
                        <div className="w-12"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-8 text-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                             <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <UsersIcon size={40} />
                             </div>
                             <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedGroup.name}</h2>
                             <p className="text-sm text-slate-500 mt-1">Group • {selectedGroup.memberIds.length} Participants</p>
                        </div>

                        <div className="mt-6 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                                Participants
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {groupMembers.map(member => (
                                    <div key={member.id} className="p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 dark:bg-slate-700 ${getNameColor(member.id)}`}>
                                            {member.firstName[0]}{member.lastName[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                {member.firstName} {member.lastName} {member.id === currentUser.id && '(You)'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tight">{member.role}</div>
                                        </div>
                                        {member.id === selectedGroup.createdByUserId && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">Admin</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 mb-20 px-4">
                            <button 
                                onClick={handleLeaveGroup}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm active:bg-red-50 transition"
                            >
                                <LogOut size={18} /> Leave Group
                            </button>
                            <p className="text-center text-slate-400 text-[10px] mt-4 uppercase font-black tracking-widest">Secure Dispatch Channel</p>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Chat Overlay */}
      {isNewChatOpen && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 z-50 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                      <input type="text" autoFocus placeholder="Search teammates..." className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-xl pl-9 pr-3 py-2 text-base focus:ring-1 focus:ring-blue-500 outline-none" value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)} />
                  </div>
                  <button onClick={() => setIsNewChatOpen(false)} className="text-blue-600 font-medium text-sm">Cancel</button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
                  {myGroups.filter(g => g.name.toLowerCase().includes(newChatSearch.toLowerCase())).map(g => (
                      <button key={g.id} onClick={() => handleSelectChat(g.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600"><UsersIcon size={18} /></div>
                          <div><div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{g.name}</div><div className="text-[11px] text-slate-500 uppercase font-bold tracking-tight">Group</div></div>
                      </button>
                  ))}
                  {validUsers.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(newChatSearch.toLowerCase())).map(u => (
                      <button key={u.id} onClick={() => handleSelectChat(u.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500"><UserIcon size={18} /></div>
                          <div><div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{u.firstName} {u.lastName}</div><div className="text-[11px] text-slate-500 uppercase font-bold tracking-tight">{u.role}</div></div>
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};