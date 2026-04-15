/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { cn } from './lib/utils';
import { 
  Send, 
  LogOut, 
  User as UserIcon, 
  MessageSquare, 
  Circle, 
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
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

// --- Types ---

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  last_seen: string | null;
  bio?: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Message {
  id: string;
  user_id: string;
  receiver_id: string | null;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  profiles?: Profile;
  reactions?: Reaction[];
}

interface PresenceState {
  [key: string]: {
    user_id: string;
    username: string;
    online_at: string;
    is_typing?: boolean;
  }[];
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

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <ConfigRequiredScreen />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main">
        <Loader2 className="w-8 h-8 animate-spin text-accent-theme" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen setError={setError} error={error} />;
  }

  return <ChatScreen session={session} />;
}

// --- Config Required Screen ---

function ConfigRequiredScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-8 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-border-theme max-w-lg w-full">
        <div className="bg-amber-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-amber-100">
          <Settings className="w-10 h-10 text-amber-500 animate-[spin_8s_linear_infinite]" />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-4">Supabase Configuration Required</h1>
        <p className="text-text-secondary mb-8 leading-relaxed">
          To enable real-time chat, you need to connect your Supabase project. Please add the following keys to your project <strong>Secrets</strong>:
        </p>
        
        <div className="space-y-3 text-left mb-8">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <code className="text-xs font-bold text-blue-600 block mb-1">VITE_SUPABASE_URL</code>
            <p className="text-xs text-slate-500">Your Supabase project URL (e.g., https://xyz.supabase.co)</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <code className="text-xs font-bold text-blue-600 block mb-1">VITE_SUPABASE_ANON_KEY</code>
            <p className="text-xs text-slate-500">Your Supabase project anonymous public key</p>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 text-sm flex gap-3 items-start text-left">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>After adding the secrets, the application will automatically refresh and connect to your database.</p>
        </div>
      </div>
    </div>
  );
}

// --- Profile Settings Component ---

function ProfileSettings({ profile, onClose, onUpdate, userId }: { profile: Profile | null, onClose: () => void, onUpdate: (p: Profile) => void, userId: string }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert('Error uploading avatar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      onUpdate(data);
      onClose();
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border-theme">
        <div className="p-6 border-b border-border-theme flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Profile Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-accent-theme shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
            </div>
            <p className="text-xs text-text-secondary">Click to change avatar</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-bg-main border border-border-theme rounded-xl focus:ring-2 focus:ring-accent-theme outline-none transition-all"
                placeholder="Your username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 bg-bg-main border border-border-theme rounded-xl focus:ring-2 focus:ring-accent-theme outline-none transition-all h-24 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-sm border border-border-theme hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent-theme hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthScreen({ setError, error }: { setError: (err: string | null) => void, error: string | null }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
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
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username }
          }
        });
        if (error) throw error;
        
        // If signup successful, we might need to manually create the profile 
        // if the trigger isn't set up, but we'll assume the trigger handles it.
        if (data.user) {
          // Check if profile exists, if not create it (fallback)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();
            
          if (!profile) {
            await supabase.from('profiles').insert({
              id: data.user.id,
              username: username || email.split('@')[0]
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-slate-500 text-center mb-8">
          {isLogin ? 'Sign in to join the conversation' : 'Join our global chat community'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="johndoe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-slate-400 text-xs max-w-sm text-center">
        Make sure you have configured your Supabase environment variables and applied the SQL schema provided in <code>supabase_schema.sql</code>.
      </div>
    </div>
  );
}

// --- Chat Screen ---

function ChatScreen({ session }: { session: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null); // null means Global Chat
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const user = session.user;

  // Fetch initial messages and profile
  useEffect(() => {
    const fetchData = async () => {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch last 50 messages for the current context
      let query = supabase
        .from('messages')
        .select('*, profiles(*), reactions(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedUser) {
        query = query.or(`and(user_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(user_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`);
      } else {
        // No global chat, return empty
        setMessages([]);
        return;
      }

      const { data: messagesData } = await query;

      if (messagesData) {
        setMessages(messagesData.reverse());
      }
    };

    fetchData();

    // Subscribe to messages
    const channelName = selectedUser ? `chat:${selectedUser.id}` : 'no-chat';
    if (!selectedUser) return;

    const messageChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as Message;
          const isGlobalView = !selectedUser && !newMsg.receiver_id;
          const isDMView = selectedUser && (
            (newMsg.user_id === user.id && newMsg.receiver_id === selectedUser.id) ||
            (newMsg.user_id === selectedUser.id && newMsg.receiver_id === user.id)
          );

          if (isGlobalView || isDMView) {
            const { data: newMsgWithProfile } = await supabase
              .from('messages')
              .select('*, profiles(*), reactions(*)')
              .eq('id', newMsg.id)
              .single();

            if (newMsgWithProfile) {
              setMessages((prev) => [...prev, newMsgWithProfile]);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionChannel = supabase
      .channel('public:reactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        async (payload) => {
          const reaction = (payload.new || payload.old) as Reaction;
          
          // Refresh the specific message's reactions
          const { data: updatedMsg } = await supabase
            .from('messages')
            .select('*, profiles(*), reactions(*)')
            .eq('id', reaction.message_id)
            .single();

          if (updatedMsg) {
            setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        }
      )
      .subscribe();

    // Presence and Typing
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
        
        const typing = Object.values(state)
          .flat()
          .filter((u: any) => u.is_typing && u.user_id !== user.id)
          .map((u: any) => u.username);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            username: profile?.username || user.email?.split('@')[0],
            online_at: new Date().toISOString(),
            is_typing: false
          });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user.id, profile?.username, selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

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

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      if (audioBlob) {
        const fileName = `${crypto.randomUUID()}.webm`;
        const filePath = `audio/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(filePath, audioBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);
        
        audioUrl = publicUrl;
      }

      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        receiver_id: selectedUser?.id || null,
        content: newMessage.trim() || null,
        image_url: imageUrl,
        audio_url: audioUrl
      });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      setImagePreview(null);
      setAudioBlob(null);
      setRecordingDuration(0);
      stopTyping();
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert('Failed to send message: ' + err.message);
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
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      updatePresence(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    updatePresence(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const updatePresence = async (typing: boolean) => {
    const channel = supabase.channel('online-users');
    await channel.track({
      user_id: user.id,
      username: profile?.username || user.email?.split('@')[0],
      online_at: new Date().toISOString(),
      is_typing: typing
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const existingReaction = messages
      .find(m => m.id === messageId)
      ?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);

    if (existingReaction) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji
        });
    }
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden font-sans">
      {/* Sidebar - Online Users */}
      <aside className="hidden md:flex w-[280px] flex-col bg-sidebar-bg border-r border-border-theme">
        <div className="p-6 border-b border-border-theme">
          <h1 className="text-xl font-bold tracking-tight text-accent-theme flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Chatify
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Online Users List */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-2 px-2">Direct Messages</h3>
            <div className="space-y-1">
              {onlineUsers.filter(u => u.user_id !== user.id).map((u, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedUser({ id: u.user_id, username: u.username, avatar_url: null, last_seen: null })}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    selectedUser?.id === u.user_id ? "bg-accent-soft text-accent-theme shadow-sm" : "hover:bg-slate-50 text-text-primary"
                  )}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-white font-bold text-xs uppercase">
                      {u.username?.[0] || '?'}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{u.username}</span>
                    <span className="text-[10px] opacity-70">
                      {u.is_typing ? "typing..." : "Online"}
                    </span>
                  </div>
                </button>
              ))}
              {onlineUsers.filter(u => u.user_id !== user.id).length === 0 && (
                <p className="text-xs text-text-secondary px-2 italic">No other users online</p>
              )}
            </div>
          </div>
        </div>
          <div className="p-6 border-t border-border-theme bg-white">
            <div className="flex items-center gap-3 mb-4 group cursor-pointer" onClick={() => setShowProfileSettings(true)}>
              <div className="relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute -top-1 -right-1 bg-accent-theme text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="w-3 h-3" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-text-primary truncate">{profile?.username || 'User'}</span>
                <span className="text-xs text-text-secondary truncate">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <ProfileSettings 
            profile={profile} 
            onClose={() => setShowProfileSettings(false)} 
            onUpdate={(updated) => setProfile(updated)}
            userId={user.id}
          />
        )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-main p-8 text-center">
            <div className="bg-accent-soft w-24 h-24 rounded-3xl flex items-center justify-center mb-6">
              <MessageSquare className="w-12 h-12 text-accent-theme" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to Chatify</h2>
            <p className="text-text-secondary max-w-xs">Select a friend from the sidebar to start a private conversation.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="h-[70px] border-b border-border-theme flex items-center justify-between px-8 shrink-0 bg-white z-10">
              <div className="room-info">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-online rounded-full"></div>
                  Chat with {selectedUser.username}
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-text-secondary rounded font-bold">
                    Private
                  </span>
                </h2>
                <p className="text-xs text-text-secondary">
                  End-to-end secure messaging
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button className="md:hidden text-text-secondary hover:text-text-primary" onClick={handleSignOut}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-5 scroll-smooth bg-bg-main">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-40 space-y-4">
                  <MessageSquare className="w-16 h-16" />
                  <p className="text-sm font-medium">No messages yet. Say hi!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.user_id === user.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        isOwn ? "ml-auto items-end sent" : "mr-auto items-start received"
                      )}
                    >
                      <div className={cn(
                        "msg-meta text-[11px] text-text-secondary mb-1 px-1",
                        isOwn ? "text-right" : "text-left"
                      )}>
                        {!isOwn && (
                          <span className="font-bold mr-1">
                            {msg.profiles?.username || 'Unknown'} •
                          </span>
                        )}
                        <span>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                      <div 
                        className={cn(
                          "bubble px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed relative group/msg",
                          isOwn 
                            ? "bg-accent-theme text-white rounded-br-none" 
                            : "bg-white text-text-primary border border-border-theme rounded-bl-none"
                        )}
                      >
                        {msg.image_url && (
                          <img 
                            src={msg.image_url} 
                            alt="Shared image" 
                            className="rounded-lg mb-2 max-w-full h-auto border border-black/5"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {msg.audio_url && (
                          <div className="flex items-center gap-3 py-1">
                            <audio src={msg.audio_url} controls className="h-8 w-48" />
                          </div>
                        )}
                        {msg.content}

                    {/* Quick Reactions Tooltip */}
                    <div className={cn(
                      "absolute -top-8 bg-white border border-border-theme shadow-lg rounded-full px-2 py-1 flex gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20",
                      isOwn ? "right-0" : "left-0"
                    )}>
                      {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-1 grayscale hover:grayscale-0"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Displayed Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={cn(
                        "absolute -bottom-4 flex flex-wrap gap-1",
                        isOwn ? "right-0 justify-end" : "left-0 justify-start"
                      )}>
                        {Object.entries(
                          msg.reactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([emoji, count]) => {
                          const hasReacted = msg.reactions?.some(r => r.user_id === user.id && r.emoji === emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all",
                                hasReacted 
                                  ? "bg-accent-soft border-accent-theme text-accent-theme" 
                                  : "bg-white border-border-theme text-text-secondary hover:border-slate-300"
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          <div className="typing-indicator h-5 px-1">
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-text-secondary text-xs italic">
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...` 
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <footer className="px-8 py-4 bg-white border-t border-border-theme shrink-0">
          {(imagePreview || audioBlob) && (
            <div className="mb-4 flex gap-4 items-end">
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-border-theme shadow-sm" />
                  <button 
                    onClick={() => { setImagePreview(null); setSelectedFile(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {audioBlob && (
                <div className="relative bg-accent-soft p-4 rounded-xl border border-accent-theme flex items-center gap-3">
                  <div className="bg-accent-theme p-2 rounded-full text-white">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-accent-theme">Voice Message Ready</span>
                  <button 
                    onClick={() => setAudioBlob(null)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-text-secondary hover:text-accent-theme hover:bg-accent-soft rounded-xl transition-all"
                title="Upload image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-3 text-red-500 bg-red-50 rounded-xl animate-pulse flex items-center gap-2"
                  title="Stop recording"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span className="text-xs font-bold">{formatDuration(recordingDuration)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-3 text-text-secondary hover:text-accent-theme hover:bg-accent-soft rounded-xl transition-all"
                  title="Record voice message"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
            
            <div className="flex-1 bg-bg-main border border-border-theme rounded-xl px-5 py-3 transition-all focus-within:border-accent-theme focus-within:ring-1 focus-within:ring-accent-theme">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={stopTyping}
                placeholder={selectedUser ? `Message ${selectedUser.username}...` : "Type your message here..."}
                className="w-full bg-transparent border-none text-sm text-text-primary placeholder:text-text-secondary outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile && !audioBlob) || uploading}
              className="bg-accent-theme hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex-shrink-0 flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </form>
        </footer>
      </>
    )}
  </main>
</div>
  );
}
