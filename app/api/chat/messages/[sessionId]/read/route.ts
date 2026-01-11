import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/middleware';
import { z } from 'zod';

const markReadSchema = z.object({
  messageIds: z.array(z.string()).optional(),
});

// POST /api/chat/messages/[sessionId]/read - Mark messages as read
export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const validation = markReadSchema.safeParse(body);

    let whereClause: {
      sessionId: string;
      senderId: { not: string };
      status: { not: 'READ' };
      id?: { in: string[] };
    } = {
      sessionId,
      senderId: {
        not: currentUser.id,
      },
      status: {
        not: 'READ',
      },
    };

    // If specific message IDs provided, only mark those
    if (validation.success && validation.data.messageIds?.length) {
      whereClause = {
        ...whereClause,
        id: {
          in: validation.data.messageIds,
        },
      };
    }

    // Mark messages as read
    const result = await prisma.message.updateMany({
      where: whereClause,
      data: {
        status: 'READ',
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
