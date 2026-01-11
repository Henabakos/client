import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';

// GET /api/chat/sessions - Get all chat sessions for current user
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessions = await prisma.chatSession.findMany({
      where: {
        OR: [
          { user1Id: currentUser.id },
          { user2Id: currentUser.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        messages: {
          where: {
            status: {
              not: 'READ',
            },
            senderId: {
              not: currentUser.id,
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        lastMessageTime: 'desc',
      },
    });

    // Transform to match frontend Conversation type
    const conversations = sessions.map(session => {
      // Get the other user in the session
      const otherUser = session.user1Id === currentUser.id ? session.user2 : session.user1;
      const isAI = otherUser.email === 'ai@chatflow.app';

      return {
        id: session.id,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          avatar: otherUser.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`,
          status: otherUser.isOnline ? 'Online' : 'Offline',
          lastSeen: otherUser.lastSeen?.toISOString(),
        },
        lastMessage: session.lastMessage || '',
        lastMessageTime: session.lastMessageTime?.toISOString() || session.createdAt.toISOString(),
        unreadCount: session.messages.length,
        isAI,
      };
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}
