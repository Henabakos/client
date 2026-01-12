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

        // Get AI response using Gemini
        // We'll use a simple implementation for now. Since the frontend expects streaming, 
        // but the current geminiService doesn't support it easily in this structure, 
        // we'll implement a simple non-streaming response format that the frontend can parse,
        // or just return the text.

        // Actually, ChatContext.tsx expects a streaming response in Vercel AI SDK format (0:\"...\")
        const aiResponse = await geminiService.refineText(message); // Or a proper chat method

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
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json({ error: 'AI failed to respond' }, { status: 500 });
    }
}
