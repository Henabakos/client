import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthenticatedUser } from '@/lib/middleware';

// GET /api/ai/status - Check AI availability
export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const hasApiKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    return NextResponse.json({
      available: hasApiKey,
      model: 'gemini-1.5-flash',
      provider: 'Google AI',
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      { error: 'Failed to check AI status' },
      { status: 500 }
    );
  }
}
