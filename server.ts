import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Track online users: Map<sessionToken, { userId, socketId }>
const onlineUsers = new Map<string, { userId: string; socketId: string }>();
// Track user sockets: Map<userId, Set<socketId>>
const userSockets = new Map<string, Set<string>>();

async function validateSession(token: string): Promise<{ userId: string; user: { id: string; name: string; email: string } } | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return { userId: session.userId, user: session.user };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

async function setUserOnline(userId: string, online: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: online,
        lastSeen: online ? undefined : new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const session = await validateSession(token);
    
    if (!session) {
      return next(new Error('Invalid or expired session'));
    }

    // Attach user info to socket
    socket.data.userId = session.userId;
    socket.data.user = session.user;
    socket.data.token = token;
    
    next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    const user = socket.data.user;
    const token = socket.data.token;
    
    console.log(`User connected: ${user.name} (${userId})`);

    // Track this connection
    onlineUsers.set(token, { userId, socketId: socket.id });
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Update online status if this is the first connection for this user
    if (userSockets.get(userId)!.size === 1) {
      await setUserOnline(userId, true);
      // Broadcast to all connected users that this user is online
      socket.broadcast.emit('user:online', { userId, user });
    }

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Handle joining a chat room
    socket.on('room:join', async (data: { sessionId: string }) => {
      const { sessionId } = data;
      
      // Verify user is part of this session
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });

      if (session) {
        socket.join(`chat:${sessionId}`);
        console.log(`User ${user.name} joined room: chat:${sessionId}`);
        
        // Mark messages as delivered
        await prisma.message.updateMany({
          where: {
            sessionId,
            senderId: { not: userId },
            status: 'SENT',
          },
          data: {
            status: 'DELIVERED',
          },
        });
      }
    });

    // Handle leaving a chat room
    socket.on('room:leave', (data: { sessionId: string }) => {
      socket.leave(`chat:${data.sessionId}`);
      console.log(`User ${user.name} left room: chat:${data.sessionId}`);
    });

    // Handle sending a message
    socket.on('message:send', async (data: { sessionId: string; content: string; tempId?: string }) => {
      const { sessionId, content, tempId } = data;

      try {
        // Verify user is part of this session
        const session = await prisma.chatSession.findFirst({
          where: {
            id: sessionId,
            OR: [
              { user1Id: userId },
              { user2Id: userId },
            ],
          },
        });

        if (!session) {
          socket.emit('message:error', { error: 'Session not found', tempId });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            sessionId,
            senderId: userId,
            content,
            status: 'SENT',
            isAI: false,
          },
        });

        // Update session
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            lastMessage: content.length > 100 ? content.substring(0, 100) + '...' : content,
            lastMessageTime: new Date(),
          },
        });

        const transformedMessage = {
          id: message.id,
          senderId: message.senderId,
          text: message.content,
          timestamp: message.createdAt.toISOString(),
          status: 'sent' as const,
          isAI: false,
          sessionId: message.sessionId,
          tempId,
        };

        // Send to all in the chat room
        io.to(`chat:${sessionId}`).emit('message:new', transformedMessage);

        // Also send notification to the recipient's personal room (if not in chat room)
        const recipientId = session.user1Id === userId ? session.user2Id : session.user1Id;
        io.to(`user:${recipientId}`).emit('message:notification', {
          ...transformedMessage,
          senderName: user.name,
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', { error: 'Failed to send message', tempId });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data: { sessionId: string }) => {
      socket.to(`chat:${data.sessionId}`).emit('typing:start', { userId, sessionId: data.sessionId });
    });

    socket.on('typing:stop', (data: { sessionId: string }) => {
      socket.to(`chat:${data.sessionId}`).emit('typing:stop', { userId, sessionId: data.sessionId });
    });

    // Handle marking messages as read
    socket.on('message:read', async (data: { sessionId: string; messageIds?: string[] }) => {
      const { sessionId, messageIds } = data;

      try {
        const whereClause: {
          sessionId: string;
          senderId: { not: string };
          status: { not: 'READ' };
          id?: { in: string[] };
        } = {
          sessionId,
          senderId: { not: userId },
          status: { not: 'READ' },
        };

        if (messageIds?.length) {
          whereClause.id = { in: messageIds };
        }

        await prisma.message.updateMany({
          where: whereClause,
          data: { status: 'READ' },
        });

        // Notify the sender that messages were read
        socket.to(`chat:${sessionId}`).emit('message:read', { sessionId, readBy: userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.name} (${userId})`);
      
      // Remove this connection from tracking
      onlineUsers.delete(token);
      userSockets.get(userId)?.delete(socket.id);

      // Only set offline if no other connections for this user
      if (!userSockets.get(userId)?.size) {
        userSockets.delete(userId);
        await setUserOnline(userId, false);
        // Broadcast to all connected users that this user is offline
        socket.broadcast.emit('user:offline', { userId });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running`);
  });
});
