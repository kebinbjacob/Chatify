/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { cn } from './lib/utils';
import { 
  Send, 
  LogOut, 
  User as UserIcon, 
  MessageSquare, 
  Loader2,
  AlertCircle,
  Settings,
  Image as ImageIcon,
  X,
  Globe,
  Mic,
  Square,
  Play,
  Pause,
  Search,
  Menu,
  MoreVertical
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

// --- Types ---

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  last_seen: string | null;
  bio?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  profiles?: Profile;
}

// --- Components ---

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <ConfigRequiredScreen />;
  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen setError={setError} error={error} />;

  return <ChatScreen session={session} />;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-main">
      <Loader2 className="w-8 h-8 animate-spin text-accent-theme" />
    </div>
  );
}

function ConfigRequiredScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-8 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-border-theme max-w-lg w-full">
        <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-amber-100">
          <Settings className="w-10 h-10 text-amber-500 animate-[spin_8s_linear_infinite]" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-4">Supabase Configuration Required</h1>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Please add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> to your project Secrets.
        </p>
      </div>
    </div>
  );
}

function AuthScreen({ setError, error }: { setError: (e: string | null) => void, error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { username } }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-border-theme w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Chatify</h1>
          <p className="text-text-secondary mt-2">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="johndoe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline text-sm font-bold"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatScreen({ session }: { session: any }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const user = session.user;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setEditedBio(data.bio || '');
      }
    };
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').neq('id', user.id).order('username');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, [user.id]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles:profiles!sender_id(*)')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as Message;
        
        // Update last messages for sidebar
        setLastMessages(prev => ({
          ...prev,
          [newMsg.sender_id === user.id ? (newMsg.receiver_id || 'global') : newMsg.sender_id]: newMsg
        }));

        // Filter for current chat
        if ((newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.id) || 
            (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === user.id)) {
          const { data: fullMsg } = await supabase
            .from('messages')
            .select('*, profiles:profiles!sender_id(*)')
            .eq('id', newMsg.id)
            .single();
          if (fullMsg) setMessages(prev => [...prev, fullMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile && !audioBlob) return;

    setUploading(true);
    let imageUrl = null;
    let audioUrl = null;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        await supabase.storage.from('chat-images').upload(filePath, selectedFile);
        const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      if (audioBlob) {
        const fileName = `${crypto.randomUUID()}.webm`;
        const filePath = `audio/${user.id}/${fileName}`;
        await supabase.storage.from('chat-images').upload(filePath, audioBlob);
        const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(filePath);
        audioUrl = publicUrl;
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser?.id || null,
        content: newMessage.trim(),
        image_url: imageUrl,
        audio_url: audioUrl
      });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      setImagePreview(null);
      setAudioBlob(null);
      setRecordingDuration(0);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `avatars/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          bio: editedBio,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, bio: editedBio, avatar_url: avatarUrl || prev.avatar_url } : null);
      setShowProfileModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden font-sans relative">
      {/* Mobile Backdrop */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "absolute inset-y-0 left-0 z-50 w-80 flex flex-col bg-white border-r border-border-theme transition-transform duration-300 md:relative md:translate-x-0",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-border-theme flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Chatify</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
          <div className="pt-4 pb-2 px-4">
            <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Direct Messages</h2>
          </div>

          {filteredUsers.map(u => {
            const lastMsg = lastMessages[u.id];
            return (
              <button 
                key={u.id}
                onClick={() => { setSelectedUser(u); setShowSidebar(false); }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl transition-all group",
                  selectedUser?.id === u.id ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-text-secondary"
                )}
              >
                <div className="relative">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-border-theme">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-2.5 h-2.5 bg-online rounded-full border-2 border-white" />
                  </div>
                </div>
                <div className="flex-1 text-left truncate">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-sm truncate">{u.username}</p>
                    {lastMsg && (
                      <span className="text-[9px] opacity-50 font-medium">
                        {format(new Date(lastMsg.created_at), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-60 truncate leading-tight">
                    {lastMsg ? (
                      lastMsg.sender_id === user.id ? `You: ${lastMsg.content}` : lastMsg.content
                    ) : (u.bio || 'No messages yet')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border-theme bg-slate-50/50">
          <div className="flex items-center gap-3 p-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Me" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-border-theme">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{profile?.username || 'User'}</p>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter">My Profile</p>
            </div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-text-secondary transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-border-theme w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-theme flex items-center justify-between">
              <h3 className="text-xl font-bold text-text-primary">Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="text-center mb-6">
                <div className="relative inline-block group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  {avatarPreview || profile?.avatar_url ? (
                    <img src={avatarPreview || profile?.avatar_url!} alt="Me" className="w-24 h-24 rounded-[2rem] object-cover mx-auto mb-4 shadow-lg border-4 border-white group-hover:opacity-75 transition-opacity" />
                  ) : (
                    <div className="w-24 h-24 rounded-[2rem] bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-border-theme group-hover:bg-slate-200 transition-colors">
                      <UserIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 p-2 rounded-full text-white">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    onChange={handleAvatarSelect} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
                <p className="font-bold text-text-primary">{profile?.username}</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">Click to change avatar</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 ml-1">Bio</label>
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-32"
                />
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-main relative">
        <header className="h-20 bg-white border-b border-border-theme flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu className="w-6 h-6 text-text-secondary" />
            </button>
            {selectedUser && (
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-border-theme">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-text-primary leading-none mb-1">{selectedUser.username}</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-online rounded-full" />
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Online Now</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {selectedUser && (
            <button 
              onClick={() => setShowUserInfo(!showUserInfo)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                showUserInfo ? "bg-blue-50 text-blue-600" : "hover:bg-slate-100 text-text-secondary"
              )}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </header>

        {selectedUser ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user.id;
                  const isNextFromSame = idx < messages.length - 1 && messages[idx + 1].sender_id === msg.sender_id;
                  const showDate = idx === 0 || format(new Date(messages[idx - 1].created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd');

                  return (
                    <div key={msg.id} className={cn("flex flex-col", !isNextFromSame ? "mb-4" : "mb-1")}>
                      {showDate && (
                        <div className="flex justify-center my-8">
                          <span className="px-4 py-1.5 bg-white border border-border-theme rounded-full text-[10px] font-bold text-text-secondary uppercase tracking-widest shadow-sm">
                            {isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn("max-w-[85%] md:max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl shadow-sm relative overflow-hidden",
                            isOwn ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-text-primary border border-border-theme rounded-bl-none"
                          )}>
                            {msg.image_url && (
                              <img src={msg.image_url} alt="Shared" className="rounded-xl max-w-full mb-2 cursor-pointer" onClick={() => window.open(msg.image_url!, '_blank')} />
                            )}
                            {msg.audio_url && (
                              <audio controls className="max-w-full mb-2 h-10"><source src={msg.audio_url} type="audio/webm" /></audio>
                            )}
                            {msg.content && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                            <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                              <span className={cn("text-[10px] font-medium opacity-60")}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isOwn && (
                                <div className="flex items-center ml-0.5 opacity-60">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <footer className="p-6 bg-white border-t border-border-theme">
                {imagePreview && (
                  <div className="mb-4 relative inline-block animate-in slide-in-from-bottom-2">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-2xl border-2 border-blue-500 shadow-xl" />
                    <button onClick={() => { setSelectedFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {audioBlob && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <Play className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-blue-600">Voice Message Recorded</span>
                    </div>
                    <button onClick={() => setAudioBlob(null)} className="p-2 hover:bg-blue-100 rounded-xl text-blue-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-200 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                  <div className="flex items-center gap-1 pl-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-text-secondary transition-all">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  </div>

                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    placeholder={`Message ${selectedUser.username}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 resize-none max-h-32 min-h-[44px] custom-scrollbar"
                    rows={1}
                  />

                  <div className="flex items-center gap-1 pr-2">
                    {isRecording ? (
                      <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-500 rounded-2xl border border-red-100 animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-xs font-bold tabular-nums">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                        <button type="button" onClick={stopRecording} className="p-1 hover:bg-red-100 rounded-lg transition-colors"><Square className="w-4 h-4 fill-current" /></button>
                      </div>
                    ) : (
                      !newMessage.trim() && !selectedFile && !audioBlob ? (
                        <button type="button" onClick={startRecording} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-text-secondary transition-all"><Mic className="w-5 h-5" /></button>
                      ) : (
                        <button type="submit" disabled={uploading} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      )
                    )}
                  </div>
                </form>
              </footer>
            </div>

            {/* User Info Sidebar */}
            {showUserInfo && (
              <aside className="w-80 bg-white border-l border-border-theme flex flex-col animate-in slide-in-from-right duration-300 hidden lg:flex">
                <div className="p-6 border-b border-border-theme flex items-center justify-between">
                  <h3 className="font-bold text-text-primary">User Info</h3>
                  <button onClick={() => setShowUserInfo(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  <div className="text-center">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt={selectedUser.username} className="w-32 h-32 rounded-[2.5rem] object-cover mx-auto mb-4 shadow-xl border-4 border-white" />
                    ) : (
                      <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-border-theme">
                        <UserIcon className="w-12 h-12" />
                      </div>
                    )}
                    <h4 className="text-xl font-bold text-text-primary">{selectedUser.username}</h4>
                    <p className="text-xs text-online font-bold uppercase tracking-widest mt-1">Online</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">About</h5>
                      <p className="text-sm text-text-primary leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {selectedUser.bio || "No bio available for this user."}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Shared Media</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {messages.filter(m => m.image_url).slice(-6).map(m => (
                          <img 
                            key={m.id} 
                            src={m.image_url!} 
                            alt="Shared" 
                            className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(m.image_url!, '_blank')}
                          />
                        ))}
                        {messages.filter(m => m.image_url).length === 0 && (
                          <div className="col-span-3 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">No media shared</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-main">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-border-theme max-w-md w-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              <div className="bg-blue-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <MessageSquare className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tight">Start a Conversation</h2>
              <p className="text-text-secondary mb-10 leading-relaxed">
                Select a user from the sidebar to begin a private, secure chat.
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                <span>End-to-End Encrypted</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
