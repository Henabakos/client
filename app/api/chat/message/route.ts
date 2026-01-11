import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';
import { z } from 'zod';

const sendMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
});

// POST /api/chat/message - Send a message
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, content } = validation.data;

    // Verify user is part of this session
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { user1Id: currentUser.id },
          { user2Id: currentUser.id },
        ],
      },
      include: {
        user1: {
          select: { id: true },
        },
        user2: {
          select: { id: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found or access denied' },
        { status: 404 }
      );
    }

    // Create message and update session in a transaction
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          sessionId,
          senderId: currentUser.id,
          content,
          status: 'SENT',
          isAI: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          lastMessage: content.length > 100 ? content.substring(0, 100) + '...' : content,
          lastMessageTime: new Date(),
        },
      }),
    ]);

    // Transform to match frontend Message type
    const transformedMessage = {
      id: message.id,
      senderId: message.senderId,
      text: message.content,
      timestamp: message.createdAt.toISOString(),
      status: message.status.toLowerCase() as 'sent' | 'delivered' | 'read',
      isAI: message.isAI,
      sessionId: message.sessionId,
    };

    // Get recipient ID for socket notification
    const recipientId = session.user1Id === currentUser.id ? session.user2Id : session.user1Id;

    return NextResponse.json({
      message: transformedMessage,
      recipientId,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
