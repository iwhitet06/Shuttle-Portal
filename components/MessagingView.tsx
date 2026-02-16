import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppData, User, UserRole, LocationType, Group } from '../types';
import { sendMessage, markMessagesAsRead, createGroup, leaveGroup } from '../services/supabaseService';
import { Send, User as UserIcon, Briefcase, Plus, X, Users as UsersIcon, MessageSquare, MapPin, Search, Loader2, ChevronLeft, Info, LogOut, CheckSquare, Square, Check } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';

interface MessagingViewProps {
  data: AppData;
  currentUser: User;
  refreshData: () => Promise<AppData | null>;
  initialSelectedUserId?: string | null;
  onClearTarget: () => void;
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

const getDateLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const MessagingView: React.FC<MessagingViewProps> = ({ data, currentUser, refreshData, initialSelectedUserId, onClearTarget, onUpdateProfile }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedUserId || null);
  const [msgContent, setMsgContent] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  
  const [newChatSearch, setNewChatSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLeavingGroupId, setIsLeavingGroupId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChatId, data.messages]);

  // Handle external selection (from global search)
  useEffect(() => {
    if (initialSelectedUserId) {
        setSelectedChatId(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  const handleSelectChat = async (id: string) => {
      setSelectedChatId(id);
      setIsNewChatOpen(false);
      setIsNewGroupOpen(false);
      setIsGroupInfoOpen(false);
      
      const isGroup = data.groups?.some(g => g.id === id);
      if (!isGroup) {
          try {
            await markMessagesAsRead(id, currentUser.id); 
          } catch (e) {
            console.error("Read receipt failed", e);
          }
      }
      await refreshData();
  };

  const handleBack = () => {
    setSelectedChatId(null);
    onClearTarget();
  };

  const handleLeaveGroup = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const idToLeave = selectedChatId;
    if (!idToLeave || isLeavingGroupId === idToLeave) return;
    
    if (window.confirm('Are you sure you want to leave this group? It will be removed from your history.')) {
        // STEP 1: UI REMOVAL (Optimistic)
        // Immediately trigger local hiding via state
        setIsLeavingGroupId(idToLeave);
        setSelectedChatId(null);
        setIsGroupInfoOpen(false);
        onClearTarget();
        
        // STEP 2: DB SYNC
        try {
            await leaveGroup(idToLeave, currentUser.id);
            // Ensure data is fully refreshed before we ever clear the 'leaving' lock
            await refreshData(); 
        } catch (err) {
            console.error("Leave Group Failed:", err);
            alert("Failed to leave group. Please try again.");
            // If it failed, we potentially want to restore the group, but usually
            // refreshData will bring it back if the server didn't change.
        } finally {
            setIsLeavingGroupId(null);
        }
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMemberIds.size === 0 || isCreatingGroup) return;
    
    setIsCreatingGroup(true);
    try {
        const newGroup = await createGroup(groupName.trim(), currentUser.id, Array.from(selectedMemberIds));
        setGroupName('');
        setSelectedMemberIds(new Set());
        setIsNewGroupOpen(false);
        await refreshData();
        handleSelectChat(newGroup.id);
    } catch (err) {
        console.error("Group creation failed:", err);
        alert("Failed to create group. Please try again.");
    } finally {
        setIsCreatingGroup(false);
    }
  };

  const toggleMember = (id: string) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMemberIds(next);
  };

  // myGroups strictly filters out any group currently being "left" or where user isn't in membership list
  const myGroups = useMemo(() => {
    const userId = currentUser.id.toLowerCase().trim();
    return (data.groups || []).filter(g => {
        if (g.id === isLeavingGroupId) return false;
        // Check membership with normalization to avoid casing issues
        return g.memberIds.some(mId => String(mId).toLowerCase().trim() === userId);
    });
  }, [data.groups, currentUser.id, isLeavingGroupId]);

  const validUsers = useMemo(() => 
    data.users.filter(u => u.id !== currentUser.id && u.status === 'ACTIVE' && u.phone !== '000-000-0000'), 
    [data.users, currentUser.id]
  );

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
      if (!selectedChatId || selectedChatId === isLeavingGroupId) return [];
      // Final guard: only show group messages if user is confirmed in local groups list
      if (selectedChatId.includes('-') && !selectedGroup && !selectedUser) return [];

      return data.messages.filter(m => 
          selectedGroup ? m.groupId === selectedChatId : !m.groupId && ((m.fromUserId === currentUser.id && m.toUserId === selectedChatId) || (m.fromUserId === selectedChatId && m.toUserId === currentUser.id))
      ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedChatId, selectedGroup, selectedUser, data.messages, currentUser.id, isLeavingGroupId]);

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
    await refreshData();
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
                <SearchableDropdown options={data.locations.filter(l => l.isActive)} value={currentUser.currentLocationId || ''} onChange={(val) => onUpdateProfile({currentLocationId: val})} placeholder="Set Station" compact={true} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1.5 px-1 tracking-wider"><Briefcase size={10} /> Assigned Targets</label>
                <SearchableDropdown options={data.locations.filter(l => l.isActive && l.type === LocationType.WORKSITE)} value={isAdmin ? currentUser.assignedWorksiteIds || [] : (currentUser.assignedWorksiteIds?.[0] || '')} onChange={(val) => onUpdateProfile({assignedWorksiteIds: Array.isArray(val) ? val : [val]})} placeholder="Set Target" compact={true} multiple={isAdmin} />
              </div>
          </div>
          
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Chats</h3>
              <div className="flex gap-1">
                <button onClick={() => setIsNewGroupOpen(true)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="New Group"><Plus size={18} /></button>
                <button onClick={() => setIsNewChatOpen(true)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="Search"><Search size={18} /></button>
              </div>
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
              {/* STUCK HEADER */}
              <div className="flex-shrink-0 h-14 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md z-10 cursor-pointer group" onClick={() => selectedGroup && setIsGroupInfoOpen(true)}>
                  <button onClick={(e) => { e.stopPropagation(); handleBack(); }} className="md:hidden p-1.5 -ml-1 text-blue-600 transition">
                      <ChevronLeft size={24} />
                  </button>
                  <div className="flex items-center gap-3 ml-1 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${selectedGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {selectedGroup ? <UsersIcon size={18} /> : <UserIcon size={18} />}
                      </div>
                      <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {selectedGroup ? selectedGroup.name : (selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Loading...')}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                              {selectedGroup ? `${selectedGroup.memberIds.length} members • Tap for info` : (selectedUser?.role || 'Teammate')}
                          </div>
                      </div>
                  </div>
                  {selectedGroup && <div className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-full"><Info size={18} /></div>}
              </div>

              {/* SCROLLABLE MESSAGE LIST */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar">
                  {conversation.length === 0 && (
                    <div className="h-full flex items-center justify-center py-10 opacity-50 text-center">
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">Safe Environment</span>
                    </div>
                  )}
                  {conversation.map((msg, idx) => { 
                      const isMe = msg.fromUserId === currentUser.id; 
                      const sender = selectedGroup && !isMe ? data.users.find(u => u.id === msg.fromUserId) : null;
                      const showSenderName = selectedGroup && !isMe && (idx === 0 || conversation[idx-1].fromUserId !== msg.fromUserId);
                      
                      const msgDate = new Date(msg.timestamp);
                      const prevMsg = idx > 0 ? conversation[idx - 1] : null;
                      const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
                      const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                      return ( 
                          <React.Fragment key={msg.id}>
                              {showDateSeparator && (
                                  <div className="flex justify-center my-4">
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
                                          {getDateLabel(msgDate)}
                                      </span>
                                  </div>
                              )}
                              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fadeIn`}>
                                  <div className={`max-w-[85%] md:max-w-[70%] px-2.5 py-1.5 rounded-lg shadow-sm text-[13.5px] leading-[1.3] relative ${isMe ? 'bg-[#DCF8C6] dark:bg-blue-800 text-slate-900 dark:text-slate-100' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                                      {showSenderName && <div className={`text-[11px] font-bold mb-0.5 ${getNameColor(msg.fromUserId)}`}>{sender?.firstName} {sender?.lastName}</div>}
                                      <div className="inline-block pr-10">{msg.content}</div>
                                      <div className={`text-[9px] font-medium absolute bottom-1 right-1.5 opacity-50 ${isMe ? 'text-green-800 dark:text-blue-100' : 'text-slate-400'}`}>
                                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                  </div>
                              </div> 
                          </React.Fragment>
                      ); 
                  })}
              </div>

              {/* INPUT BAR */}
              <div className="flex-shrink-0 bg-white/95 dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-700 p-2 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-3">
                  <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto items-end">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center px-1">
                          <textarea rows={1} maxLength={1000} value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder="Message" className="flex-1 bg-transparent border-none py-2 px-3 focus:ring-0 outline-none text-slate-900 dark:text-slate-100 text-base font-medium resize-none max-h-32" 
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }} />
                      </div>
                      <button type="submit" disabled={!msgContent.trim()} className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-full disabled:opacity-40 flex items-center justify-center flex-shrink-0"><Send size={18} strokeWidth={2.5} /></button>
                  </form>
              </div>

              {/* GROUP INFO OVERLAY */}
              {isGroupInfoOpen && selectedGroup && (
                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col animate-slideInRight">
                    <div className="h-14 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between sticky top-0 z-10">
                        <button onClick={() => setIsGroupInfoOpen(false)} className="text-blue-600 flex items-center gap-1 font-medium"><ChevronLeft size={24} /> Back</button>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">Group Info</h4>
                        <div className="w-12"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-8 text-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                             <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon size={40} /></div>
                             <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedGroup.name}</h2>
                             <p className="text-sm text-slate-500 mt-1">Group • {selectedGroup.memberIds.length} Participants</p>
                        </div>
                        <div className="mt-6 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50 dark:bg-slate-900/50">Participants</div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {groupMembers.map(member => (
                                    <div key={member.id} className="p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 dark:bg-slate-700 ${getNameColor(member.id)}`}>{member.firstName[0]}{member.lastName[0]}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{member.firstName} {member.lastName} {member.id === currentUser.id && '(You)'}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tight">{member.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-10 mb-20 px-4">
                            <button 
                                type="button"
                                onClick={handleLeaveGroup} 
                                disabled={isLeavingGroupId === selectedGroup.id} 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm active:bg-red-50 transition disabled:opacity-50"
                            >
                                {isLeavingGroupId === selectedGroup.id ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    <><LogOut size={18} /> Leave Group</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NEW CHAT MODAL */}
      {isNewChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-fadeIn">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Start New Chat</h3>
                <button onClick={() => setIsNewChatOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input autoFocus type="text" value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)} placeholder="Search teammates..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 dark:text-slate-100" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                {validUsers.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(newChatSearch.toLowerCase())).map(user => (
                    <button key={user.id} onClick={() => handleSelectChat(user.id)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold">{user.firstName[0]}{user.lastName[0]}</div>
                        <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.firstName} {user.lastName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tight">{user.role}</div>
                        </div>
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {isNewGroupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-fadeIn">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Create Group</h3>
                <button onClick={() => setIsNewGroupOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block px-1 tracking-wider">Group Name</label>
                        <input required type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Night Shift Team" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 dark:text-slate-100 font-bold" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block px-1 tracking-wider">Select Members ({selectedMemberIds.size})</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input type="text" value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Search teammates..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-xs" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 border-t border-slate-50 dark:border-slate-700 no-scrollbar">
                    {validUsers.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(groupSearch.toLowerCase())).map(user => {
                        const isSelected = selectedMemberIds.has(user.id);
                        return (
                        <button key={user.id} type="button" onClick={() => toggleMember(user.id)} className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 mb-1 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-600 text-slate-400 dark:text-slate-300'}`}>
                                {isSelected ? <Check size={16} /> : <UserIcon size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'}`}>{user.firstName} {user.lastName}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tight">{user.role}</div>
                            </div>
                        </button>
                    )})}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                    <button type="submit" disabled={!groupName.trim() || selectedMemberIds.size === 0 || isCreatingGroup} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                        {isCreatingGroup ? <Loader2 className="animate-spin" size={20} /> : <><UsersIcon size={18} /> Create Group</>}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};