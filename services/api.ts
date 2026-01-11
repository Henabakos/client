import { authClient } from '@/lib/auth-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// API request helper with credentials for Better Auth cookies
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important for Better Auth cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Get session token for WebSocket authentication
export const getSessionToken = async (): Promise<string | null> => {
  try {
    const session = await authClient.getSession();
    // Better Auth stores the session token in a cookie, we need to get it
    // The token is available from the session object
    if (session.data?.session) {
      return session.data.session.token;
    }
    return null;
  } catch {
    return null;
  }
};

// Auth API using Better Auth
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Registration failed');
    }

    return {
      user: result.data?.user,
      token: result.data?.token,
    };
  },

  login: async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Login failed');
    }

    return {
      user: result.data?.user,
      token: result.data?.token,
    };
  },

  googleAuth: async () => {
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}`,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Google login failed');
    }

    return result.data;
  },

  me: async () => {
    const session = await authClient.getSession();

    if (!session.data?.user) {
      throw new Error('Not authenticated');
    }

    // Return the user from the session with transformed data
    const user = session.data.user;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      status: 'Online',
    };
  },

  getSession: async () => {
    const session = await authClient.getSession();
    return session.data;
  },

  logout: async () => {
    await authClient.signOut();
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return request<Array<{
      id: string;
      name: string;
      email: string;
      avatar: string;
      status: string;
      lastSeen?: string;
    }>>('/users');
  },

  getById: async (userId: string) => {
    return request<{
      id: string;
      name: string;
      email: string;
      avatar: string;
      status: string;
      lastSeen?: string;
      createdAt: string;
    }>(`/users/${userId}`);
  },

  search: async (query: string) => {
    return request<Array<{
      id: string;
      name: string;
      email: string;
      avatar: string;
      status: string;
      lastSeen?: string;
    }>>(`/users/search?q=${encodeURIComponent(query)}`);
  },
};

// Chat API
export const chatAPI = {
  getSessions: async () => {
    return request<Array<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        status: string;
        lastSeen?: string;
      };
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
      isAI?: boolean;
    }>>('/chat/sessions');
  },

  getOrCreateSession: async (userId: string) => {
    return request<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        status: string;
        lastSeen?: string;
      };
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
      isAI?: boolean;
    }>(`/chat/session/${userId}`);
  },

  getMessages: async (sessionId: string, limit = 50, cursor?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);

    return request<{
      messages: Array<{
        id: string;
        senderId: string;
        text: string;
        timestamp: string;
        status: 'sent' | 'delivered' | 'read';
        isAI?: boolean;
      }>;
      nextCursor: string | null;
    }>(`/chat/messages/${sessionId}?${params}`);
  },

  sendMessage: async (sessionId: string, content: string) => {
    return request<{
      message: {
        id: string;
        senderId: string;
        text: string;
        timestamp: string;
        status: 'sent' | 'delivered' | 'read';
        isAI?: boolean;
        sessionId: string;
      };
      recipientId: string;
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, content }),
    });
  },

  markAsRead: async (sessionId: string, messageIds?: string[]) => {
    return request<{ success: boolean; count: number }>(
      `/chat/messages/${sessionId}/read`,
      {
        method: 'POST',
        body: JSON.stringify({ messageIds }),
      }
    );
  },
};

// AI API
export const aiAPI = {
  getSession: async () => {
    return request<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        status: string;
      };
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
      isAI: boolean;
    }>('/ai/chat');
  },

  chat: async (sessionId: string, message: string) => {
    // For streaming AI responses, we use fetch directly
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ sessionId, message }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'AI chat failed' }));
      throw new Error(error.error || 'AI chat failed');
    }

    return response;
  },

  status: async () => {
    return request<{
      available: boolean;
      model: string;
      provider: string;
    }>('/ai/status');
  },
};
