import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
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

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Refine and improve the following message to make it clearer, more professional, and well-written. Keep the same meaning and intent. Only return the refined text, nothing else. If the text is already good, return it as is with minor improvements if needed.

Original message: "${text}"

Refined message:`,
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500,
      },
    });

    const refinedText = response.text?.trim() || text;

    return NextResponse.json({ refinedText });
  } catch (error: any) {
    console.error('Error refining text:', error);
    
    // Check for quota exceeded error
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
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
