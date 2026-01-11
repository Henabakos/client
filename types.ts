
export enum UserStatus {
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  lastSeen?: string;
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  isAI?: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isAI?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
