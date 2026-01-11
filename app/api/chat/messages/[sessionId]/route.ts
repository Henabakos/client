import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';

// GET /api/chat/messages/[sessionId] - Get all messages for a chat session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Verify user is part of this session
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { user1Id: currentUser.id },
          { user2Id: currentUser.id },
        ],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found or access denied' },
        { status: 404 }
      );
    }

    // Get pagination params
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor');

    const messages = await prisma.message.findMany({
      where: {
        sessionId,
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
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),
    });

    // Transform to match frontend Message type
    const transformedMessages = messages.map(message => ({
      id: message.id,
      senderId: message.senderId,
      text: message.content,
      timestamp: message.createdAt.toISOString(),
      status: message.status.toLowerCase() as 'sent' | 'delivered' | 'read',
      isAI: message.isAI,
    }));

    // Mark messages as read if they're from the other user
    await prisma.message.updateMany({
      where: {
        sessionId,
        senderId: {
          not: currentUser.id,
        },
        status: {
          not: 'READ',
        },
      },
      data: {
        status: 'READ',
      },
    });

    return NextResponse.json({
      messages: transformedMessages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
