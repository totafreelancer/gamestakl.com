import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../api/chat';
import { socialService } from '../api/social';
import UserAvatar from './UserAvatar';
import {
  Send, ArrowLeft, MessageCircle, Search, X, UserPlus, ImagePlus,
  Loader2, Check, CheckCheck, Phone, Video, Info, Users, LogOut,
  UserMinus, Crown, Plus, PhoneOff, VideoOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

/* ================================================================
   Chat Component — HubZone
   - 1-on-1 DM + Group Chat
   - Profile navigation (click avatar/name → /profile/:username)
   - Audio/Video calling with WebSocket signaling
   - Dark mode support
   ================================================================ */
const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ---- Core State ----
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showGroupCreateModal, setShowGroupCreateModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // ---- Group Create State ----
  const [groupName, setGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // ---- Add Members State ----
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // ---- Calling State ----
  const [callState, setCallState] = useState(null);
  // callState: null | { type: 'outgoing', callType, peerUser, sessionId }
  //          | { type: 'incoming', callType, caller, sessionId }
  //          | { type: 'connected', callType, peerUser, sessionId }

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(selectedConversation);
  const callStateRef = useRef(callState);

  useEffect(() => { selectedConversationRef.current = selectedConversation; }, [selectedConversation]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ---- Derived ----
  const currentUserId = Number(user?.id);
  const isGroup = selectedConversation?.conversation_type === 'group' || selectedConversation?.is_group;
  const isAdmin = isGroup && Number(selectedConversation?.admin?.id) === currentUserId;

  // ==================== DATA FETCHING ====================

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      setShowGroupInfo(false);
    }
  }, [selectedConversation?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (selectedConversation && user) connectWebSocket();
    return () => {
      if (ws) ws.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation?.id, user?.id]);

  const fetchConversations = async () => {
    try { setLoading(true); setConversations(await chatService.getConversations()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchMessages = async (id) => {
    try { setMessages(await chatService.getMessages(id)); } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ==================== WEBSOCKET ====================

  const connectWebSocket = () => {
    if (ws) ws.close();
    const cid = selectedConversation.id;
    if (!cid) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('accessToken');
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${cid}/?token=${token || ''}`);
    socket.onopen = () => setWsConnected(true);
    socket.onmessage = (e) => { try { handleWS(JSON.parse(e.data)); } catch {} };
    socket.onclose = () => {
      setWsConnected(false);
      setTimeout(() => {
        if (selectedConversationRef.current?.id === cid) connectWebSocket();
      }, 3000);
    };
    socket.onerror = () => setWsConnected(false);
    setWs(socket);
  };

  const sendWS = (type, payload = {}) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...payload }));
  };

  const handleWS = (d) => {
    switch (d.type) {
      case 'new_message': {
        const sid = Number(d.sender_id);
        setMessages((prev) => prev.some((m) => m.id === d.message_id) ? prev : [...prev, {
          id: d.message_id, sender_id: sid, sender_username: d.sender_username,
          sender_profile_picture: d.sender_profile_picture, text: d.text || '',
          image_url: d.image_url || '', message_type: d.message_type || 'TEXT',
          file_url: d.file_url || d.image_url || '', timestamp: d.timestamp, is_seen: d.is_seen,
        }]);
        if (sid !== currentUserId && selectedConversationRef.current) {
          sendWS('mark_as_seen', {});
          chatService.markSeen(selectedConversationRef.current.id).catch(() => {});
        }
        fetchConversations();
        break;
      }
      case 'typing':
        setTypingUsers((p) => {
          if (d.is_typing) return { ...p, [d.user_id]: d.username };
          const u = { ...p };
          delete u[d.user_id];
          return u;
        });
        break;
      case 'messages_seen':
        setMessages((prev) => prev.map((m) => Number(m.sender_id) === currentUserId ? { ...m, is_seen: true } : m));
        break;
      case 'online_status':
        setOnlineUsers((p) => ({ ...p, [d.user_id]: d.is_online }));
        break;
      case 'call_signal':
        handleCallSignal(d);
        break;
      default: break;
    }
  };

  // ==================== CALLING ====================

  const handleCallSignal = (d) => {
    const myId = currentUserId;
    switch (d.signal_type) {
      case 'call_incoming':
        // Only the intended receiver should show the incoming call modal
        if (Number(d.receiver_id) === myId && !callStateRef.current) {
          setCallState({
            type: 'incoming',
            callType: d.call_type,
            caller: {
              id: d.caller_id,
              username: d.caller_username,
              profile_picture: d.caller_profile_picture,
            },
            sessionId: d.session_id,
            conversationId: d.conversation_id,
          });
        }
        break;
      case 'call_accepted':
        if (callStateRef.current?.type === 'outgoing') {
          setCallState((prev) => ({ ...prev, type: 'connected' }));
          toast.success(`${d.accepted_by_username} accepted your call`);
        }
        break;
      case 'call_declined':
        if (callStateRef.current?.type === 'outgoing') {
          setCallState(null);
          toast.error(`${d.declined_by_username} declined your call`);
        }
        break;
      case 'call_ended':
        setCallState(null);
        break;
      default:
        break;
    }
  };

  const initiateCall = (callType) => {
    if (!selectedConversation || isGroup) return;
    const peer = selectedConversation.other_user;
    if (!peer) return;
    const sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    // Send call_user to the conversation WebSocket — the consumer will
    // derive the receiver and forward to their personal user group
    sendWS('call_user', {
      conversation_id: selectedConversation.id,
      call_type: callType,
      session_id: sessionId,
    });
    setCallState({ type: 'outgoing', callType, peerUser: peer, sessionId });
  };

  const acceptCall = () => {
    if (!callState || callState.type !== 'incoming') return;
    sendWS('call_accept', {
      session_id: callState.sessionId,
      caller_id: callState.caller?.id,
    });
    setCallState({
      type: 'connected',
      callType: callState.callType,
      peerUser: callState.caller,
      sessionId: callState.sessionId,
    });
  };

  const declineCall = () => {
    if (!callState) return;
    sendWS('call_decline', {
      session_id: callState.sessionId,
      caller_id: callState.caller?.id,
    });
    setCallState(null);
  };

  const endCall = () => {
    if (!callState) return;
    sendWS('call_end', { session_id: callState.sessionId });
    setCallState(null);
  };

  // ==================== MESSAGING ====================

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;
    const text = newMessage.trim();
    const file = selectedFile;
    setNewMessage(''); setSelectedFile(null); setFilePreview(null); setSending(true);
    try {
      if (file) {
        // ── IMAGE UPLOAD FLOW ──────────────────────────────────
        // 1. Upload the image to get a URL
        const uploadResult = await chatService.uploadMessageImage(file);
        // 2. Broadcast via WebSocket with message_type=IMAGE
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'send_message',
            text: text || '',
            image_url: uploadResult.image_url || '',
            message_type: 'IMAGE',
          }));
        }
        // 3. Also save via REST endpoint for persistence
        await chatService.sendMessageWithFile(selectedConversation.id, text, file);
      } else {
        // ── TEXT MESSAGE FLOW ──────────────────────────────────
        await chatService.sendMessage(selectedConversation.id, text);
      }
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (e) { toast.error(e.error || 'Failed to send'); } finally { setSending(false); }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (wsConnected) {
      sendWS('typing_status', { is_typing: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendWS('typing_status', { is_typing: false }), 2000);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Select an image'); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setSelectedFile(f);
    const r = new FileReader();
    r.onloadend = () => setFilePreview(r.result);
    r.readAsDataURL(f);
  };

  const removeFile = () => { setSelectedFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // ==================== USER SEARCH (DM) ====================

  const handleSearchChange = (e) => {
    const v = e.target.value; setSearchQuery(v);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (v.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try { setSearching(true); setSearchResults(await socialService.searchUsers(v.trim())); } catch {} finally { setSearching(false); }
    }, 400);
    searchTimeoutRef.current = t;
  };

  const handleSelectUser = async (u) => {
    try {
      const conv = await chatService.getOrCreateDM(u.id);
      setSelectedConversation(conv); setShowNewMessageModal(false); setSearchQuery(''); setSearchResults([]);
      await fetchConversations();
    } catch { toast.error('Failed to start conversation'); }
  };

  // ==================== GROUP CREATE ====================

  const handleGroupSearch = (e) => {
    const v = e.target.value; setGroupSearchQuery(v);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (v.trim().length < 2) { setGroupSearchResults([]); return; }
    const t = setTimeout(async () => {
      try { setGroupSearchResults((await socialService.searchUsers(v.trim())).filter((r) => !selectedMembers.some((m) => m.id === r.id))); } catch {}
    }, 400);
    searchTimeoutRef.current = t;
  };

  const addMember = (u) => { if (!selectedMembers.some((m) => m.id === u.id)) setSelectedMembers([...selectedMembers, u]); setGroupSearchQuery(''); setGroupSearchResults([]); };
  const removeMember = (id) => setSelectedMembers(selectedMembers.filter((m) => m.id !== id));

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return; }
    if (selectedMembers.length < 2) { toast.error('Select at least 2 members'); return; }
    setCreatingGroup(true);
    try {
      const g = await chatService.createGroup(groupName.trim(), selectedMembers.map((m) => m.id));
      setSelectedConversation(g); setShowGroupCreateModal(false); setGroupName(''); setSelectedMembers([]); await fetchConversations();
      toast.success('Group created!');
    } catch (e) { toast.error(e.error || 'Failed to create group'); } finally { setCreatingGroup(false); }
  };

  // ==================== GROUP MEMBER MANAGEMENT ====================

  const handleAddSearch = (e) => {
    const v = e.target.value; setAddSearchQuery(v);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (v.trim().length < 2) { setAddSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const existing = selectedConversation?.participants?.map((p) => p.id) || [];
        setAddSearchResults((await socialService.searchUsers(v.trim())).filter((r) => !existing.includes(r.id)));
      } catch {}
    }, 400);
    searchTimeoutRef.current = t;
  };

  const handleAddMembers = async (users) => {
    if (!users.length) return;
    setAddingMembers(true);
    try {
      await chatService.addGroupMembers(selectedConversation.id, users.map((u) => u.id));
      await fetchConversations();
      setSelectedConversation(await chatService.getConversation(selectedConversation.id));
      setShowAddMembersModal(false); setAddSearchQuery(''); setAddSearchResults([]);
      toast.success('Members added!');
    } catch (e) { toast.error(e.error || 'Failed'); } finally { setAddingMembers(false); }
  };

  const handleRemoveMember = async (uid) => {
    if (!confirm('Remove this member?')) return;
    try {
      await chatService.removeGroupMember(selectedConversation.id, uid);
      await fetchConversations();
      setSelectedConversation(await chatService.getConversation(selectedConversation.id));
      toast.success('Member removed');
    } catch (e) { toast.error(e.error || 'Failed'); }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    try { await chatService.leaveGroup(selectedConversation.id); setSelectedConversation(null); await fetchConversations(); toast.success('Left group'); }
    catch (e) { toast.error(e.error || 'Failed'); }
  };

  // ==================== HELPERS ====================

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const dd = Math.floor(diff / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    if (dd < 7) return `${dd}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const fmtMsgTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isOnline = (uid) => onlineUsers[uid] || false;
  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);
  const typingNames = Object.values(typingUsers);

  // Profile navigation helper
  const goToProfile = (username) => {
    if (username) navigate(`/profile/${username}`);
  };

  // ==================== RENDER ====================

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3 dark:text-white">
          <MessageCircle className="w-7 h-7 md:w-8 md:h-8 text-cyan-500" />
          Messages
          {totalUnread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{totalUnread}</span>}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewMessageModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/25">
            <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">New Chat</span>
          </button>
          <button onClick={() => { setShowGroupCreateModal(true); setGroupName(''); setSelectedMembers([]); }} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25">
            <Users className="w-4 h-4" /><span className="hidden sm:inline">New Group</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm dark:bg-dark-800 dark:border-dark-700" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">

          {/* ======== SIDEBAR ======== */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-dark-700 flex-shrink-0 flex flex-col ${selectedConversation && !showGroupInfo ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-dark-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Chats</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length >= 2) handleSearchChange(e); }} placeholder="Search conversations..." className="w-full bg-gray-100 border-0 rounded-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400" />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-20 ml-4 w-72 bg-white border border-gray-200 rounded-xl shadow-xl dark:bg-dark-800 dark:border-dark-700 max-h-60 overflow-y-auto">
                {searchResults.map((r) => (
                  <button key={r.id} onClick={() => handleSelectUser(r)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left">
                    <UserAvatar user={{ username: r.username, profile_picture_url: r.profile_picture_url }} size="md" />
                    <div><p className="font-medium text-gray-900 text-sm dark:text-white">{r.username}</p>{r.in_game_id && <p className="text-xs text-gray-500 dark:text-gray-400">ID: {r.in_game_id}</p>}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-14 h-14 text-gray-300 mx-auto mb-3 dark:text-gray-600" />
                  <p className="text-gray-500 font-medium dark:text-gray-400">No conversations yet</p>
                  <p className="text-gray-400 text-sm dark:text-gray-500 mb-4">Start messaging or create a group!</p>
                  <div className="flex flex-col gap-2 items-center">
                    <button onClick={() => setShowNewMessageModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"><UserPlus className="w-4 h-4" /> New Chat</button>
                    <button onClick={() => setShowGroupCreateModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"><Users className="w-4 h-4" /> New Group</button>
                  </div>
                </div>
              ) : conversations.map((conv) => {
                const sel = selectedConversation?.id === conv.id;
                const lm = conv.last_msg;
                const grp = conv.conversation_type === 'group' || conv.is_group;
                const dn = conv.display_name || (grp ? conv.name : conv.other_user?.username) || 'Unknown';
                const da = conv.display_avatar;
                const ou = conv.other_user;
                const on = !grp && isOnline(ou?.id);
                return (
                  <button key={conv.id} onClick={() => { setSelectedConversation(conv); setShowGroupInfo(false); }} className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left dark:hover:bg-dark-700 ${sel ? 'bg-cyan-50 border-l-4 border-cyan-500 dark:bg-cyan-500/10' : ''}`}>
                    <div className="relative flex-shrink-0">
                      <UserAvatar user={{ username: dn, profile_picture_url: da }} />
                      {on && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full dark:border-dark-800"></span>}
                      {grp && <span className="absolute -top-1 -left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"><Users className="w-3 h-3 text-white" /></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 truncate text-sm dark:text-white">{dn}</span>
                        {lm && <span className="text-xs text-gray-400 flex-shrink-0 ml-2 dark:text-gray-500">{fmtTime(lm.timestamp)}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                          {lm
                            ? lm.message_type === 'IMAGE'
                              ? '📷 Photo'
                              : lm.text
                                ? `${lm.sender_username === user?.username ? 'You: ' : (grp ? lm.sender_username + ': ' : '')}${lm.text}`
                                : '📷 Photo'
                            : 'No messages yet'}
                        </p>
                        {conv.unread_count > 0 && <span className="bg-cyan-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2">{conv.unread_count}</span>}
                      </div>
                      {grp && <p className="text-[10px] text-gray-400 mt-0.5 dark:text-gray-500">{conv.participant_count || conv.participants?.length || 0} members</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======== CHAT WINDOW ======== */}
          <div className={`flex-1 flex flex-col ${!selectedConversation || showGroupInfo ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-700 bg-white/80 backdrop-blur-sm dark:bg-dark-800/80">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedConversation(null); setShowGroupInfo(false); }} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-dark-700 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                    <button onClick={() => !isGroup && goToProfile(selectedConversation.other_user?.username)} className="relative flex-shrink-0 hover:opacity-80 transition-opacity">
                      <UserAvatar user={{ username: selectedConversation.display_name || 'Unknown', profile_picture_url: selectedConversation.display_avatar }} size="sm" />
                      {!isGroup && selectedConversation.other_user && isOnline(selectedConversation.other_user.id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full dark:border-dark-800"></span>}
                    </button>
                    <button onClick={() => !isGroup && goToProfile(selectedConversation.other_user?.username)} className="text-left hover:opacity-80 transition-opacity">
                      <h3 className="font-semibold text-gray-900 text-sm dark:text-white">{selectedConversation.display_name || 'Unknown'}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{isGroup ? `${selectedConversation.participant_count || selectedConversation.participants?.length || 0} members` : (isOnline(selectedConversation.other_user?.id) ? 'Active now' : 'Offline')}</p>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isGroup && (
                      <>
                        <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-dark-700 transition-colors" title="Audio call"><Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                        <button onClick={() => initiateCall('video')} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-dark-700 transition-colors" title="Video call"><Video className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                      </>
                    )}
                    {isGroup && <button onClick={() => setShowGroupInfo(!showGroupInfo)} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-dark-700 transition-colors" title="Group info"><Info className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>}
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Messages */}
                  <div className={`flex-1 flex flex-col min-w-0 ${showGroupInfo && isGroup ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-dark-900">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <button onClick={() => !isGroup && goToProfile(selectedConversation.other_user?.username)} className="hover:opacity-80 transition-opacity">
                            <UserAvatar user={{ username: selectedConversation.display_name || 'Unknown', profile_picture_url: selectedConversation.display_avatar }} size="xl" />
                          </button>
                          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{selectedConversation.display_name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isGroup ? 'Group created. Start the conversation!' : `Start a conversation`}</p>
                        </div>
                      ) : messages.map((msg, idx) => {
                        const isOwn = Number(msg.sender_id ?? msg.sender) === currentUserId;
                        const showAv = !isOwn && (idx === messages.length - 1 || Number(messages[idx + 1]?.sender_id ?? messages[idx + 1]?.sender) !== Number(msg.sender_id ?? msg.sender));
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isOwn && (
                                <div className="w-8 flex-shrink-0">
                                  {showAv && (
                                    <button onClick={() => goToProfile(msg.sender_username)} className="hover:opacity-80 transition-opacity">
                                      <UserAvatar user={{ username: msg.sender_username, profile_picture_url: msg.sender_profile_picture }} size="sm" />
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className={`px-4 py-2.5 relative group ${isOwn ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl rounded-br-md' : 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm dark:bg-dark-700 dark:text-white dark:shadow-none'}`}>
                                {isGroup && !isOwn && showAv && (
                                  <button onClick={() => goToProfile(msg.sender_username)} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1 hover:underline">{msg.sender_username}</button>
                                )}
                                {/* ── IMAGE MESSAGE ─────────────────────────────────── */}
                                {msg.message_type === 'IMAGE' && msg.image_url && (
                                  <div className="mb-1.5">
                                    <img
                                      src={msg.image_url}
                                      alt="Shared image"
                                      className="max-w-full rounded-xl max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-white/20 shadow-sm"
                                      onClick={() => window.open(msg.image_url, '_blank')}
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                {/* ── FILE ATTACHMENT (legacy) ─────────────────────── */}
                                {msg.message_type !== 'IMAGE' && msg.file_url && (
                                  <img src={msg.file_url} alt="" className="max-w-full rounded-lg mb-2 max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.file_url, '_blank')} />
                                )}
                                {/* ── TEXT CONTENT ─────────────────────────────────── */}
                                {msg.text && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>}
                                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                  <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>{fmtMsgTime(msg.timestamp)}</span>
                                  {isOwn && <span className="text-white/60">{msg.is_seen ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {typingNames.length > 0 && (
                        <div className="flex justify-start"><div className="flex items-end gap-2"><div className="w-8"><UserAvatar user={{ username: selectedConversation.display_name, profile_picture_url: selectedConversation.display_avatar }} size="sm" /></div><div className="bg-white dark:bg-dark-700 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm"><div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div></div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {filePreview && (
                      <div className="px-4 pb-2 bg-gray-50 dark:bg-dark-900"><div className="relative inline-block"><img src={filePreview} alt="Preview" className="max-h-32 rounded-lg border border-gray-200 dark:border-dark-600" /><button type="button" onClick={removeFile} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"><X className="w-3 h-3" /></button></div></div>
                    )}

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
                      <div className="flex items-end gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors flex-shrink-0" title="Attach image"><ImagePlus className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                        <div className="flex-1 relative">
                          <textarea value={newMessage} onChange={handleTyping} placeholder="Type a message..." rows={1} className="w-full bg-gray-100 border-0 rounded-2xl px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400 resize-none" style={{ minHeight: '42px', maxHeight: '120px' }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} />
                        </div>
                        <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-cyan-500/25">
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 ml-12 dark:text-gray-500">Press Enter to send · Shift+Enter for new line</p>
                    </form>
                  </div>

                  {/* Group Info Panel */}
                  {showGroupInfo && isGroup && (
                    <div className="w-72 border-l border-gray-200 dark:border-dark-700 flex-shrink-0 overflow-y-auto bg-white dark:bg-dark-800">
                      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
                        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-900 dark:text-white">Group Info</h3><button onClick={() => setShowGroupInfo(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg dark:hover:bg-dark-700"><X className="w-4 h-4 text-gray-500" /></button></div>
                        <div className="text-center">
                          <UserAvatar user={{ username: selectedConversation.name, profile_picture_url: selectedConversation.avatar_url }} size="xl" />
                          <h4 className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedConversation.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConversation.participants?.length || 0} members</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="p-3 border-b border-gray-200 dark:border-dark-700">
                          <button onClick={() => setShowAddMembersModal(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors dark:text-cyan-400 dark:hover:bg-cyan-500/10"><Plus className="w-4 h-4" /> Add Members</button>
                        </div>
                      )}
                      <div className="p-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">Members</h4>
                        <div className="space-y-1">
                          {selectedConversation.participants?.map((p) => {
                            const pAdmin = Number(p.id) === Number(selectedConversation.admin?.id);
                            return (
                              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700">
                                <button onClick={() => goToProfile(p.username)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                  <UserAvatar user={{ username: p.username, profile_picture_url: p.profile_picture }} size="sm" />
                                  <div><p className="text-sm font-medium text-gray-900 dark:text-white">{p.username}</p>{pAdmin && <p className="text-[10px] text-amber-500 flex items-center gap-0.5"><Crown className="w-3 h-3" /> Admin</p>}</div>
                                </button>
                                {isAdmin && Number(p.id) !== currentUserId && <button onClick={() => handleRemoveMember(p.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 dark:hover:bg-red-500/10" title="Remove"><UserMinus className="w-4 h-4" /></button>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-dark-700">
                        <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-500/10"><LogOut className="w-4 h-4" /> Leave Group</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-900">
                <div className="text-center px-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/25"><MessageCircle className="w-10 h-10 text-white" /></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Messages</h3>
                  <p className="text-gray-500 mt-2 dark:text-gray-400 max-w-sm">Select a conversation or create a new group to start chatting.</p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    <button onClick={() => setShowNewMessageModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 shadow-lg shadow-cyan-500/25"><UserPlus className="w-4 h-4" /> New Chat</button>
                    <button onClick={() => setShowGroupCreateModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 shadow-lg shadow-purple-500/25"><Users className="w-4 h-4" /> New Group</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======== CALL OVERLAY ======== */}
      {callState && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-dark-800 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl border border-gray-200 dark:border-dark-700">
            {callState.type === 'outgoing' && (
              <>
                <div className="relative inline-block mb-4">
                  <UserAvatar user={{ username: callState.peerUser?.username, profile_picture_url: callState.peerUser?.profile_picture }} size="xl" />
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-30"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{callState.peerUser?.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Calling {callState.callType}...</p>
                <div className="flex items-center justify-center gap-1 mt-4">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <button onClick={endCall} className="mt-6 w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"><PhoneOff className="w-5 h-5" /> Cancel</button>
              </>
            )}
            {callState.type === 'incoming' && (
              <>
                <div className="relative inline-block mb-4">
                  <UserAvatar user={{ username: callState.caller?.username, profile_picture_url: callState.caller?.profile_picture }} size="xl" />
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-30"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{callState.caller?.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Incoming {callState.callType} call...</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={declineCall} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"><PhoneOff className="w-5 h-5" /> Decline</button>
                  <button onClick={acceptCall} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2">{callState.callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />} Accept</button>
                </div>
              </>
            )}
            {callState.type === 'connected' && (
              <>
                <div className="relative inline-block mb-4">
                  <UserAvatar user={{ username: callState.peerUser?.username, profile_picture_url: callState.peerUser?.profile_picture }} size="xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-800">{callState.callType === 'video' ? <Video className="w-3 h-3 text-white" /> : <Phone className="w-3 h-3 text-white" />}</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{callState.peerUser?.username}</h3>
                <p className="text-sm text-green-500 font-medium mt-1">Connected</p>
                <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">WebRTC signaling ready — integrate your media stream here</p>
                <button onClick={endCall} className="mt-6 w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"><PhoneOff className="w-5 h-5" /> End Call</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======== DM MODAL ======== */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white"><UserPlus className="w-6 h-6 text-cyan-500" /> New Message</h3><button onClick={() => { setShowNewMessageModal(false); setSearchQuery(''); setSearchResults([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-dark-700"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button></div>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search users..." className="w-full bg-gray-100 border-0 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400" autoFocus /></div>
            <div className="flex-1 overflow-y-auto">
              {searching ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /></div>
                : searchResults.length > 0 ? searchResults.map((r) => (<button key={r.id} onClick={() => handleSelectUser(r)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left dark:hover:bg-dark-700"><UserAvatar user={{ username: r.username, profile_picture_url: r.profile_picture_url }} /><div><p className="font-medium text-gray-900 text-sm dark:text-white">{r.username}</p>{r.in_game_id && <p className="text-xs text-gray-500 dark:text-gray-400">ID: {r.in_game_id}</p>}</div></button>))
                : searchQuery.length >= 2 ? <p className="text-center text-gray-500 py-8 dark:text-gray-400">No users found</p>
                : <p className="text-center text-gray-400 py-8 dark:text-gray-500">Type 2+ characters</p>}
            </div>
          </div>
        </div>
      )}

      {/* ======== GROUP CREATE MODAL ======== */}
      {showGroupCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white"><Users className="w-6 h-6 text-purple-500" /> Create Group</h3>
              <button onClick={() => { setShowGroupCreateModal(false); setGroupName(''); setSelectedMembers([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-dark-700"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Group Name *</label><input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name..." className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400" /></div>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Add Members *</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={groupSearchQuery} onChange={handleGroupSearch} placeholder="Search users..." className="w-full bg-gray-100 border-0 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400" /></div></div>
            {groupSearchResults.length > 0 && <div className="mb-4 max-h-32 overflow-y-auto border border-gray-200 rounded-xl dark:border-dark-700">{groupSearchResults.map((r) => (<button key={r.id} onClick={() => addMember(r)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left dark:hover:bg-dark-700"><UserAvatar user={{ username: r.username, profile_picture_url: r.profile_picture_url }} size="sm" /><span className="text-sm text-gray-900 dark:text-white">{r.username}</span><Plus className="w-4 h-4 text-gray-400 ml-auto" /></button>))}</div>}
            {selectedMembers.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Selected ({selectedMembers.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full pl-1 pr-2 py-1 dark:bg-purple-500/10 dark:border-purple-500/30">
                      <UserAvatar user={{ username: m.username, profile_picture_url: m.profile_picture_url }} size="xs" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{m.username}</span>
                      <button onClick={() => removeMember(m.id)} className="p-0.5 hover:bg-purple-200 rounded-full dark:hover:bg-purple-500/20"><X className="w-3 h-3 text-purple-500" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleCreateGroup} disabled={creatingGroup || !groupName.trim() || selectedMembers.length < 2} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25">{creatingGroup ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Create Group (${selectedMembers.length} members)`}</button>
            <p className="text-xs text-gray-400 mt-2 text-center dark:text-gray-500">Minimum 2 members required</p>
          </div>
        </div>
      )}

      {/* ======== ADD MEMBERS MODAL ======== */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white"><Plus className="w-6 h-6 text-cyan-500" /> Add Members</h3><button onClick={() => { setShowAddMembersModal(false); setAddSearchQuery(''); setAddSearchResults([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-dark-700"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button></div>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={addSearchQuery} onChange={handleAddSearch} placeholder="Search users..." className="w-full bg-gray-100 border-0 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-dark-700 dark:text-white dark:placeholder-gray-400" autoFocus /></div>
            <div className="flex-1 overflow-y-auto">
              {addSearchResults.length > 0 ? addSearchResults.map((r) => (<button key={r.id} onClick={() => handleAddMembers([r])} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left dark:hover:bg-dark-700"><UserAvatar user={{ username: r.username, profile_picture_url: r.profile_picture_url }} /><div><p className="font-medium text-gray-900 text-sm dark:text-white">{r.username}</p></div><Plus className="w-4 h-4 text-gray-400 ml-auto" /></button>))
                : addSearchQuery.length >= 2 ? <p className="text-center text-gray-500 py-8 dark:text-gray-400">No users found</p>
                : <p className="text-center text-gray-400 py-8 dark:text-gray-500">Type 2+ characters</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
