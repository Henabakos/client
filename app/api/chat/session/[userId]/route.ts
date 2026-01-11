import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, getAvatarUrl } from '@/lib/middleware';

// GET /api/chat/session/[userId] - Get or create chat session with a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Order user IDs to ensure unique constraint
    const [user1Id, user2Id] = [currentUser.id, userId].sort();

    // Find existing session or create new one
    let session = await prisma.chatSession.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
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
    });

    if (!session) {
      // Create new session
      session = await prisma.chatSession.create({
        data: {
          user1Id,
          user2Id,
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
            select: {
              id: true,
            },
          },
        },
      });
    }

    // Get the other user in the session
    const sessionOtherUser = session.user1Id === currentUser.id ? session.user2 : session.user1;
    const isAI = sessionOtherUser.email === 'ai@chatflow.app';

    const conversation = {
      id: session.id,
      user: {
        id: sessionOtherUser.id,
        name: sessionOtherUser.name,
        email: sessionOtherUser.email,
        avatar: getAvatarUrl(sessionOtherUser.name, sessionOtherUser.image),
        status: sessionOtherUser.isOnline ? 'Online' : 'Offline',
        lastSeen: sessionOtherUser.lastSeen?.toISOString(),
      },
      lastMessage: session.lastMessage || '',
      lastMessageTime: session.lastMessageTime?.toISOString() || session.createdAt.toISOString(),
      unreadCount: session.messages.length,
      isAI,
    };

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error getting/creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to get or create chat session' },
      { status: 500 }
    );
  }
}
