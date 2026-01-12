import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, getAvatarUrl } from '@/lib/middleware';
import { geminiService } from '@/services/geminiService';

export const dynamic = 'force-dynamic';

// GET /api/ai/chat - Get or create AI chat session
export async function GET() {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find AI user
        const aiUser = await prisma.user.findUnique({
            where: { email: 'ai@chatflow.app' },
        });

        if (!aiUser) {
            return NextResponse.json({ error: 'AI Assistant not found' }, { status: 404 });
        }

        // Order user IDs to ensure unique constraint
        const [user1Id, user2Id] = [currentUser.id, aiUser.id].sort();

        // Find existing session or create new one
        let session = await prisma.chatSession.findUnique({
            where: {
                user1Id_user2Id: { user1Id, user2Id },
            },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    user1Id,
                    user2Id,
                    lastMessage: 'Hello! I am ChatFlow AI. How can I help you today?',
                    lastMessageTime: new Date(),
                },
                include: {
                    messages: true,
                },
            });
        }

        return NextResponse.json({
            id: session.id,
            user: {
                id: aiUser.id,
                name: aiUser.name,
                email: aiUser.email,
                avatar: getAvatarUrl(aiUser.name, aiUser.image),
                status: 'Online',
            },
            lastMessage: session.lastMessage || 'How can I help you today?',
            lastMessageTime: session.lastMessageTime?.toISOString() || session.createdAt.toISOString(),
            unreadCount: 0,
            isAI: true,
        });
    } catch (error) {
        console.error('Error fetching AI session:', error);
        return NextResponse.json({ error: 'Failed to fetch AI session' }, { status: 500 });
    }
}

// POST /api/ai/chat - Send message to AI and get response
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Verify session
        const session = await prisma.chatSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get AI User
        const aiUser = await prisma.user.findUnique({
            where: { email: 'ai@chatflow.app' }
        });

        if (!aiUser) {
            return NextResponse.json({ error: 'AI Assistant not found' }, { status: 404 });
        }

        // Save user message
        await prisma.message.create({
            data: {
                sessionId,
                senderId: currentUser.id,
                content: message,
                status: 'READ',
                isAI: false,
            },
        });

        // Get recent conversation history for context (last 10 messages)
        const recentMessages = await prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // Format history for Gemini (reverse to get chronological order)
        const history = recentMessages.reverse().map(msg => ({
            role: (msg.senderId === aiUser.id ? 'model' : 'user') as 'model' | 'user',
            parts: msg.content,
        }));

        // Get AI response using Gemini with history
        const aiResponse = await geminiService.chat(message, history);

        // Save AI message
        await prisma.message.create({
            data: {
                sessionId,
                senderId: aiUser.id,
                content: aiResponse,
                status: 'DELIVERED',
                isAI: true,
            },
        });

        // Update last message in session
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: {
                lastMessage: aiResponse.length > 100 ? aiResponse.substring(0, 100) + '...' : aiResponse,
                lastMessageTime: new Date(),
            },
        });


        // Return in Vercel AI SDK format for the frontend's reader
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const text = JSON.stringify(aiResponse);
                controller.enqueue(encoder.encode(`0:${text}\n`));
                controller.close();
            },
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    } catch (error: any) {
        console.error('AI chat error:', error);

        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
            return NextResponse.json(
                { error: 'AI quota exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: 'AI failed to respond' }, { status: 500 });
    }
}
