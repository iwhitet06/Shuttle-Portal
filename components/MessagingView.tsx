import React, { useState, useEffect } from 'react';
import { AppData, User, UserRole, LocationType, Group } from '../types';
import { sendMessage, markMessagesAsRead, createGroup } from '../services/supabaseService';
import { Send, User as UserIcon, Briefcase, Plus, X, Users as UsersIcon, MessageSquare, MapPin } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';

interface MessagingViewProps {
  data: AppData;
  currentUser: User;
  refreshData: () => void;
  initialSelectedUserId?: string | null;
  onUpdateProfile: (updates: { currentLocationId?: string, assignedWorksiteIds?: string[] }) => Promise<void>;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ data, currentUser, refreshData, initialSelectedUserId, onUpdateProfile }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedUserId || null);
  const [msgContent, setMsgContent] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialSelectedUserId) setSelectedChatId(initialSelectedUserId);
  }, [initialSelectedUserId]);

  const handleSelectChat = async (id: string) => {
      setSelectedChatId(id);
      setIsNewChatOpen(false);
      setNewChatSearch('');
      const isGroup = data.groups?.some(g => g.id === id);
      if (!isGroup) await markMessagesAsRead(id, currentUser.id); 
      refreshData();
  };

  const handleWorksiteChange = async (val: any) => {
    const newIds = Array.isArray(val) ? val : [val];
    await onUpdateProfile({ assignedWorksiteIds: newIds });
  };

  const handleLocationChange = async (val: string) => {
    await onUpdateProfile({ currentLocationId: val });
  };

  const allowedIds = currentUser.permissions.allowedLocationIds;
  const activeWorksites = data.locations.filter(l => l.isActive && l.type === LocationType.WORKSITE && (!allowedIds || allowedIds.length === 0 || allowedIds.includes(l.id)));
  const activeLocations = data.locations.filter(l => l.isActive && (!allowedIds || allowedIds.length === 0 || allowedIds.includes(l.id)));
  const myGroups = (data.groups || []).filter(g => g.memberIds.includes(currentUser.id));
  const myWorksiteIds = currentUser.assignedWorksiteIds || [];
  const validUsers = data.users.filter(u => u.id !== currentUser.id && u.status === 'ACTIVE' && u.phone !== '000-000-0000');

  const existingConversationUserIds = new Set<string>();
  data.messages.forEach(m => { if (!m.groupId) { if (m.fromUserId === currentUser.id) existingConversationUserIds.add(m.toUserId!); if (m.toUserId === currentUser.id) existingConversationUserIds.add(m.fromUserId!); } });

  const allUsers = validUsers.map(u => {
        const msgs = data.messages.filter(m => !m.groupId && ((m.fromUserId === currentUser.id && m.toUserId === u.id) || (m.fromUserId === u.id && m.toUserId === currentUser.id))).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const lastMsg = msgs[0];
        const unreadCount = msgs.filter(m => m.fromUserId === u.id && m.toUserId === currentUser.id && !m.isRead).length;
        const sharesWorksite = u.assignedWorksiteIds?.some(id => myWorksiteIds.includes(id));
        const shouldShow = existingConversationUserIds.has(u.id) || sharesWorksite;
        return { type: 'USER', id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role, lastMsgTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0, unreadCount, shouldShow, data: u };
    });

  const groupItems = myGroups.map(g => {
      const msgs = data.messages.filter(m => m.groupId === g.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { type: 'GROUP', id: g.id, name: g.name, role: 'Group', lastMsgTime: msgs[0] ? new Date(msgs[0].timestamp).getTime() : 0, unreadCount: 0, shouldShow: true, data: g };
  });

  const displayItems = [...allUsers.filter(u => u.shouldShow), ...groupItems].sort((a, b) => b.lastMsgTime - a.lastMsgTime);
  const isSelectedGroup = myGroups.some(g => g.id === selectedChatId);
  const selectedUser = !isSelectedGroup ? data.users.find(u => u.id === selectedChatId) : null;
  const selectedGroup = isSelectedGroup ? myGroups.find(g => g.id === selectedChatId) : null;
  const conversation = selectedChatId ? data.messages.filter(m => isSelectedGroup ? m.groupId === selectedChatId : !m.groupId && ((m.fromUserId === currentUser.id && m.toUserId === selectedChatId) || (m.fromUserId === selectedChatId && m.toUserId === currentUser.id))).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !msgContent.trim()) return;
    await sendMessage(currentUser.id, selectedChatId, msgContent, !!selectedGroup);
    setMsgContent(''); refreshData();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newGroupName || newGroupMemberIds.length === 0) return;
      const newGroup = await createGroup(newGroupName, currentUser.id, newGroupMemberIds);
      setIsCreateGroupOpen(false); setNewGroupName(''); setNewGroupMemberIds([]);
      handleSelectChat(newGroup.id);
  };

  const renderSidebarItem = (item: typeof displayItems[0]) => (
    <button key={item.id} onClick={() => handleSelectChat(item.id)} className={`w-full text-left p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center justify-between ${selectedChatId === item.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}>
      <div className="flex items-center space-x-3"><div className={`p-2 rounded-full relative ${item.type === 'GROUP' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>{item.type === 'GROUP' ? <UsersIcon size={20} /> : <UserIcon size={20} />}</div><div><div className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1">{item.name}</div><div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{item.role}</div></div></div>
      {item.unreadCount > 0 && <div className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">{item.unreadCount}</div>}
    </button>
  );

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="h-[calc(100vh-100px)] max-w-6xl mx-auto flex flex-col md:flex-row bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className={`md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col relative ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 space-y-3">
            <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> My Current Location</label><SearchableDropdown options={activeLocations} value={currentUser.currentLocationId || ''} onChange={handleLocationChange} placeholder="Select location" compact={true} /></div>
            <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1"><Briefcase size={12} /> Assigned Targets</label><SearchableDropdown options={activeWorksites} value={isAdmin ? currentUser.assignedWorksiteIds || [] : (currentUser.assignedWorksiteIds?.[0] || '')} onChange={handleWorksiteChange} placeholder="Select worksite" compact={true} multiple={isAdmin} /></div>
        </div>
        <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center"><h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Chats</h3><div className="flex gap-1">{isAdmin && <button onClick={() => setIsCreateGroupOpen(true)} className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full transition" title="Create Group"><UsersIcon size={20} /></button>}<button onClick={() => setIsNewChatOpen(true)} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition" title="New Chat"><Plus size={20} /></button></div></div>
        <div className="flex-1 overflow-y-auto">{displayItems.length > 0 ? displayItems.map(item => renderSidebarItem(item)) : <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No active chats.</div>}</div>
        {isNewChatOpen && (
        <div className="absolute inset-0 bg-white dark:bg-slate-800 z-50 flex flex-col animate-fadeIn">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50"><div className="relative flex-1"><input type="text" autoFocus placeholder="Search users..." className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)} /></div><button onClick={() => setIsNewChatOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto">{validUsers.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(newChatSearch.toLowerCase())).map(u => (<button key={u.id} onClick={() => handleSelectChat(u.id)} className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 flex items-center gap-3"><div className="bg-slate-200 dark:bg-slate-600 p-2 rounded-full text-slate-500 dark:text-slate-300"><UserIcon size={16} /></div><div><div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{u.firstName} {u.lastName}</div><div className="text-xs text-slate-500 dark:text-slate-400">{u.role}</div></div></button>))}</div>
        </div>)}
        {isCreateGroupOpen && (
            <div className="absolute inset-0 bg-white dark:bg-slate-800 z-50 flex flex-col animate-fadeIn">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center"><h3 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2"><UsersIcon size={18} /> New Group Chat</h3><button onClick={() => setIsCreateGroupOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                <form onSubmit={handleCreateGroup} className="flex-1 p-4 flex flex-col gap-4">
                    <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Group Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. Dispatch Team" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required /></div>
                    <div className="flex-1 flex flex-col min-h-0"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Add Members</label><div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto bg-white dark:bg-slate-800">{validUsers.map(u => (<label key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={newGroupMemberIds.includes(u.id)} onChange={e => { if (e.target.checked) setNewGroupMemberIds([...newGroupMemberIds, u.id]); else setNewGroupMemberIds(newGroupMemberIds.filter(id => id !== u.id)); }} /><div><div className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.firstName} {u.lastName}</div><div className="text-xs text-slate-500 dark:text-slate-400">{u.role}</div></div></label>))}</div></div>
                    <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-purple-700 disabled:opacity-50" disabled={!newGroupName || newGroupMemberIds.length === 0}>Create Group</button>
                </form>
            </div>
        )}
      </div>
      <div className={`flex-1 flex flex-col ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedChatId ? (<div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50"><div className="text-center"><MessageSquare size={48} className="mx-auto mb-4 opacity-20" /><p>Select a chat to start messaging</p></div></div>) : (
          <><div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 shadow-sm z-10"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${isSelectedGroup ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{isSelectedGroup ? <UsersIcon size={20} /> : <UserIcon size={20} />}</div><div><div className="font-bold text-slate-800 dark:text-slate-100">{isSelectedGroup ? selectedGroup?.name : `${selectedUser?.firstName} ${selectedUser?.lastName}`}</div><div className="text-xs text-slate-500 dark:text-slate-400">{isSelectedGroup ? `${selectedGroup?.memberIds.length} Members` : selectedUser?.role}</div></div></div><button onClick={() => setSelectedChatId(null)} className="md:hidden text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/50 px-3 py-1 rounded-full">Back</button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">{conversation.length === 0 && <p className="text-center text-slate-400 text-sm mt-4">No messages yet.</p>}{conversation.map(msg => { const isMe = msg.fromUserId === currentUser.id; const sender = isSelectedGroup && !isMe ? data.users.find(u => u.id === msg.fromUserId) : null; return ( <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>{sender && <span className="text-[10px] text-slate-400 mb-1 ml-1">{sender.firstName} {sender.lastName}</span>}<div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>{msg.content}<div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div></div> ); })}</div>
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2"><input type="text" value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder={isSelectedGroup ? `Message ${selectedGroup?.name}...` : "Type a message..."} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-50" /><button type="submit" disabled={!msgContent.trim()} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"><Send size={20} /></button></form>
          </>)}
      </div>
    </div>
  );
};