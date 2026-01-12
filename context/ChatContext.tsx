'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, Conversation, UserStatus } from '../types';
import { authAPI, usersAPI, chatAPI, aiAPI } from '../services/api';
import { socketService } from '../services/socket';

interface ChatContextType {
  currentUser: User | null;
  activeConversation: Conversation | null;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  isInfoOpen: boolean;
  isLogoMenuOpen: boolean;
  isNewMessageOpen: boolean;
  isTyping: Record<string, boolean>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (text: string) => void;
  toggleInfo: () => void;
  toggleLogoMenu: () => void;
  closeLogoMenu: () => void;
  toggleNewMessage: () => void;
  closeNewMessage: () => void;
  startNewConversation: (userId: string) => Promise<void>;
  isOnline: boolean;
  allUsers: User[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const AI_ASSISTANT: User = {
  id: 'ai-assistant',
  name: 'ChatFlow AI',
  avatar: '/Container.png',
  status: UserStatus.ONLINE,
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeConversation, setActiveConv] = useState<Conversation | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  // Track current session for socket
  const currentSessionRef = useRef<string | null>(null);

  // Initialize: Check for existing session via Better Auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await authAPI.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            name: session.user.name,
            avatar: getAvatarUrl(session.user.name, session.user.image),
            status: UserStatus.ONLINE,
            email: session.user.email,
          });
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        // Load users
        const users = await usersAPI.getAll();
        const formattedUsers = users.map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          status: u.status === 'Online' ? UserStatus.ONLINE : UserStatus.OFFLINE,
          email: u.email,
        }));
        setAllUsers(formattedUsers);

        // Load sessions
        const sessions = await chatAPI.getSessions();
        const formattedConversations: Conversation[] = sessions.map((s) => ({
          id: s.id,
          user: {
            id: s.user.id,
            name: s.user.name,
            avatar: s.user.avatar,
            status: s.user.status === 'Online' ? UserStatus.ONLINE : UserStatus.OFFLINE,
          },
          lastMessage: s.lastMessage || '',
          lastMessageTime: formatTime(s.lastMessageTime),
          unreadCount: s.unreadCount || 0,
          isAI: s.isAI,
        }));

        // Check if AI session exists, if not try to get it
        const hasAISession = formattedConversations.some(c => c.isAI);
        if (!hasAISession) {
          try {
            const aiSession = await aiAPI.getSession();
            const aiConversation: Conversation = {
              id: aiSession.id,
              user: {
                id: aiSession.user.id,
                name: aiSession.user.name,
                avatar: aiSession.user.avatar,
                status: UserStatus.ONLINE,
              },
              lastMessage: aiSession.lastMessage || 'How can I help you today?',
              lastMessageTime: formatTime(aiSession.lastMessageTime),
              unreadCount: 0,
              isAI: true,
            };
            setConversations([aiConversation, ...formattedConversations]);
          } catch {
            // If AI session fails, use local AI assistant
            const aiConversation: Conversation = {
              id: 'ai-assistant',
              user: AI_ASSISTANT,
              lastMessage: 'How can I help you today?',
              lastMessageTime: 'Just now',
              unreadCount: 0,
              isAI: true,
            };
            setConversations([aiConversation, ...formattedConversations]);
          }
        } else {
          setConversations(formattedConversations);
        }

        // Initialize AI conversation messages
        setMessages(prev => ({
          ...prev,
          'ai-assistant': prev['ai-assistant'] || [{
            id: 'ai-welcome',
            senderId: 'ai-assistant',
            text: "Hello! I'm ChatFlow AI. How can I help you today? 🌟",
            timestamp: '9:00 AM',
            status: 'DELIVERED',
            isAI: true,
          }],
        }));
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [currentUser]);

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const connectSocket = async () => {
      const socket = await socketService.connect();
      if (socket) {
        setIsOnline(true);
      }
    };

    connectSocket();

    // Listen for new messages
    const unsubMessage = socketService.on('message:new', (data: any) => {
      const msg = data;
      const formattedMsg: Message = {
        id: msg.id,
        senderId: msg.senderId,
        text: msg.text,
        timestamp: formatTime(msg.timestamp),
        status: msg.status as 'SENT' | 'DELIVERED' | 'READ',
      };

      setMessages(prev => {
        const sessionMessages = prev[msg.sessionId] || [];
        // Check if message already exists (via tempId)
        if (msg.tempId) {
          const exists = sessionMessages.some(m => m.id === msg.tempId);
          if (exists) {
            return {
              ...prev,
              [msg.sessionId]: sessionMessages.map(m =>
                m.id === msg.tempId ? formattedMsg : m
              ),
            };
          }
        }
        // Check if message with same ID already exists
        if (sessionMessages.some(m => m.id === msg.id)) {
          return prev;
        }
        return {
          ...prev,
          [msg.sessionId]: [...sessionMessages, formattedMsg],
        };
      });

      // Update conversation last message
      setConversations(prev => prev.map(c =>
        c.id === msg.sessionId
          ? { ...c, lastMessage: msg.text, lastMessageTime: 'Just now' }
          : c
      ));

      // If user is currently viewing this conversation and message is from other user, mark as read
      if (currentSessionRef.current === msg.sessionId && msg.senderId !== currentUser?.id) {
        socketService.markAsRead(msg.sessionId);
      }
    });

    // Listen for message notifications (when not in the session)
    const unsubNotification = socketService.on('message:notification', (data: any) => {
      setConversations(prev => prev.map(c =>
        c.id === data.sessionId
          ? { ...c, lastMessage: data.text, lastMessageTime: 'Just now', unreadCount: c.unreadCount + 1 }
          : c
      ));
    });

    // Listen for typing indicators
    const unsubTypingStart = socketService.on('typing:start', (data: { sessionId: string; userId: string }) => {
      setIsTyping(prev => ({ ...prev, [data.sessionId]: true }));
    });

    const unsubTypingStop = socketService.on('typing:stop', (data: { sessionId: string; userId: string }) => {
      setIsTyping(prev => ({ ...prev, [data.sessionId]: false }));
    });

    // Listen for user online/offline
    const unsubOnline = socketService.on('user:online', (data: { userId: string }) => {
      setAllUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, status: UserStatus.ONLINE } : u
      ));
      setConversations(prev => prev.map(c =>
        c.user.id === data.userId ? { ...c, user: { ...c.user, status: UserStatus.ONLINE } } : c
      ));
    });

    const unsubOffline = socketService.on('user:offline', (data: { userId: string }) => {
      setAllUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, status: UserStatus.OFFLINE } : u
      ));
      setConversations(prev => prev.map(c =>
        c.user.id === data.userId ? { ...c, user: { ...c.user, status: UserStatus.OFFLINE } } : c
      ));
    });

    // Listen for message read status updates
    const unsubMessageRead = socketService.on('message:read', (data: { sessionId: string; readBy: string }) => {
      // Update all messages in this session to 'read' status (for messages sent by current user)
      setMessages(prev => {
        const sessionMessages = prev[data.sessionId];
        if (!sessionMessages) return prev;

        return {
          ...prev,
          [data.sessionId]: sessionMessages.map(m => ({
            ...m,
            status: 'READ' as const,
          })),
        };
      });
    });

    return () => {
      unsubMessage();
      unsubNotification();
      unsubTypingStart();
      unsubTypingStop();
      unsubOnline();
      unsubOffline();
      unsubMessageRead();
      socketService.disconnect();
      setIsOnline(false);
    };
  }, [currentUser]);

  // Join/leave session room when active conversation changes
  useEffect(() => {
    if (currentSessionRef.current) {
      socketService.leaveRoom(currentSessionRef.current);
    }

    if (activeConversation && !activeConversation.isAI) {
      socketService.joinRoom(activeConversation.id);
      currentSessionRef.current = activeConversation.id;

      // Load messages for this session
      loadMessages(activeConversation.id);

      // Mark messages as read via socket (real-time notification to other user)
      socketService.markAsRead(activeConversation.id);

      // Reset unread count for this conversation
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c
      ));
    } else {
      currentSessionRef.current = null;

      // Load AI messages if needed
      if (activeConversation?.isAI && activeConversation.id !== 'ai-assistant') {
        loadMessages(activeConversation.id);
      }
    }
  }, [activeConversation?.id]);

  const loadMessages = async (sessionId: string) => {
    if (sessionId === 'ai-assistant') return;

    try {
      const data = await chatAPI.getMessages(sessionId);
      const formattedMessages: Message[] = data.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        timestamp: formatTime(m.timestamp),
        status: m.status as 'SENT' | 'DELIVERED' | 'READ',
        isAI: m.isAI,
      }));

      setMessages(prev => ({
        ...prev,
        [sessionId]: formattedMessages,
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const login = async (email: string, password: string) => {
    resetState();
    const data = await authAPI.login(email, password);

    if (data.user) {
      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        avatar: getAvatarUrl(data.user.name, data.user.image),
        status: UserStatus.ONLINE,
        email: data.user.email,
      });
    }
  };

  const register = async (email: string, password: string, name: string) => {
    resetState();
    const data = await authAPI.register(email, password, name);
    if (data.user) {

      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        avatar: getAvatarUrl(data.user.name, data.user.image),
        status: UserStatus.ONLINE,
        email: data.user.email,
      });
    }
  };

  const googleLogin = async () => {
    // Better Auth handles OAuth flow by redirecting
    await authAPI.googleAuth();
  };

  const logout = () => {
    authAPI.logout().catch(console.error);
    socketService.disconnect();
    resetState();
  };

  const resetState = () => {
    setCurrentUser(null);
    setActiveConv(null);
    setConversations([]);
    setMessages({});
    setAllUsers([]);
    setIsInfoOpen(false);
    setIsLogoMenuOpen(false);
    setIsNewMessageOpen(false);
    setIsOnline(false);
  };


  const setActiveConversation = (conv: Conversation | null) => {
    setActiveConv(conv);
    setIsNewMessageOpen(false);

    if (conv) {
      // Reset unread count
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      ));
    }
  };

  const toggleInfo = () => setIsInfoOpen(!isInfoOpen);
  const toggleLogoMenu = () => setIsLogoMenuOpen(!isLogoMenuOpen);
  const closeLogoMenu = () => setIsLogoMenuOpen(false);
  const toggleNewMessage = () => setIsNewMessageOpen(!isNewMessageOpen);
  const closeNewMessage = () => setIsNewMessageOpen(false);

  const sendMessage = useCallback(async (text: string) => {
    const conv = activeConversation;
    if (!conv || !text.trim()) return;

    const conversationId = conv.id;
    const isAIConversation = conv.isAI;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    const newMessage: Message = {
      id: tempId,
      senderId: 'me',
      text,
      timestamp,
      status: 'SENT',
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage],
    }));

    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, lastMessage: text, lastMessageTime: 'Just now' } : c
    ));

    if (isAIConversation) {
      // Handle AI conversation
      setIsTyping(prev => ({ ...prev, [conversationId]: true }));

      try {
        // For streaming AI response
        const response = await aiAPI.chat(conversationId, text);

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE data
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('0:')) {
                // Vercel AI SDK text chunk format
                const textChunk = line.slice(2).trim();
                if (textChunk.startsWith('"') && textChunk.endsWith('"')) {
                  aiResponse += JSON.parse(textChunk);
                }
              }
            }
          }
        }

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          senderId: conv.user.id,
          text: aiResponse || 'I apologize, but I could not generate a response.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'DELIVERED',
          isAI: true,
        };

        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), aiMessage],
        }));

        setConversations(prev => prev.map(c =>
          c.id === conversationId ? { ...c, lastMessage: aiResponse || 'AI response', lastMessageTime: 'Just now' } : c
        ));
      } catch (error) {
        console.error('AI chat error:', error);
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          senderId: conv.user.id,
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'DELIVERED',
          isAI: true,
        };
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), errorMessage],
        }));
      } finally {
        setIsTyping(prev => ({ ...prev, [conversationId]: false }));
      }
    } else {
      // Send via WebSocket for real-time delivery
      socketService.sendMessage(conversationId, text, tempId);
    }
  }, [activeConversation]);

  const startNewConversation = async (userId: string) => {
    try {
      const session = await chatAPI.getOrCreateSession(userId);

      // Check if conversation already exists
      const existingConv = conversations.find(c => c.id === session.id);
      if (existingConv) {
        setActiveConversation(existingConv);
        return;
      }

      const newConv: Conversation = {
        id: session.id,
        user: {
          id: session.user.id,
          name: session.user.name,
          avatar: session.user.avatar,
          status: session.user.status === 'Online' ? UserStatus.ONLINE : UserStatus.OFFLINE,
        },
        lastMessage: session.lastMessage || '',
        lastMessageTime: formatTime(session.lastMessageTime),
        unreadCount: 0,
        isAI: session.isAI,
      };

      // Keep AI conversations at top
      const aiConvs = conversations.filter(c => c.isAI);
      const regularConvs = conversations.filter(c => !c.isAI);
      setConversations([...aiConvs, newConv, ...regularConvs]);
      setActiveConversation(newConv);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  return (
    <ChatContext.Provider value={{
      currentUser,
      activeConversation,
      conversations,
      messages,
      isInfoOpen,
      isLogoMenuOpen,
      isNewMessageOpen,
      isTyping,
      isLoading,
      login,
      register,
      googleLogin,
      logout,
      setActiveConversation,
      sendMessage,
      toggleInfo,
      toggleLogoMenu,
      closeLogoMenu,
      toggleNewMessage,
      closeNewMessage,
      startNewConversation,
      isOnline,
      allUsers,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

// Helper function to format time
function formatTime(dateInput: string | Date): string {
  if (!dateInput) return '';

  const date = new Date(dateInput);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) return 'Just now';

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Within a week
  if (diff < 7 * 24 * 3600000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Helper function to get avatar URL with initials
export function getAvatarUrl(name: string, image?: string | null): string {
  if (image) return image;
  if (name === 'ChatFlow AI') return '/Container.png';


  const parts = name.trim().split(/\s+/);
  let initials = '';
  if (parts.length > 0) {
    initials += parts[0][0];
    if (parts.length > 1) {
      initials += parts[parts.length - 1][0];
    }
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || 'U')}&background=random&color=fff&size=256&font-size=0.33&bold=true`;
}

