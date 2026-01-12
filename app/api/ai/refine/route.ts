import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { geminiService } from '@/services/geminiService';
import { getAuthenticatedUser } from '@/lib/middleware';
import { z } from 'zod';

const refineSchema = z.object({
  text: z.string().min(1, 'Text is required').max(2000, 'Text too long'),
});

// POST /api/ai/refine - Refine text using Gemini
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
    const validation = refineSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { text } = validation.data;
    const refinedText = await geminiService.refineText(text);

    return NextResponse.json({ refinedText });

  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    console.error('Error refining text:', error);

    // Check for quota exceeded error
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'AI quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to refine text' },
      { status: 500 }
    );
  }
}
