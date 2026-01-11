import { io, Socket } from 'socket.io-client';
import { getSessionToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private connectionPromise: Promise<Socket | null> | null = null;

  async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.doConnect();
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  private async doConnect(): Promise<Socket | null> {
    const token = await getSessionToken();
    if (!token) {
      console.warn('No auth token, cannot connect to WebSocket');
      return null;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return new Promise((resolve) => {
      this.socket!.on('connect', () => {
        console.log('WebSocket connected');
        resolve(this.socket);
      });

      this.socket!.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      this.socket!.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        resolve(null);
      });

      // Re-attach all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.socket?.connected) {
          console.warn('WebSocket connection timeout');
          resolve(null);
        }
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join a chat session room
  joinRoom(sessionId: string): void {
    this.socket?.emit('room:join', { sessionId });
  }

  // Leave a chat session room
  leaveRoom(sessionId: string): void {
    this.socket?.emit('room:leave', { sessionId });
  }

  // Send a message
  sendMessage(sessionId: string, content: string, tempId?: string): void {
    this.socket?.emit('message:send', { sessionId, content, tempId });
  }

  // Typing indicators
  startTyping(sessionId: string): void {
    this.socket?.emit('typing:start', { sessionId });
  }

  stopTyping(sessionId: string): void {
    this.socket?.emit('typing:stop', { sessionId });
  }

  // Mark messages as read
  markAsRead(sessionId: string, messageIds?: string[]): void {
    this.socket?.emit('message:read', { sessionId, messageIds });
  }

  // Event listeners with cleanup support
  on(event: string, callback: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    this.socket?.on(event, callback);

    // Return cleanup function
    return () => {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    };
  }

  // Remove a specific listener
  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  // Emit an event
  emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }
}

export const socketService = new SocketService();
