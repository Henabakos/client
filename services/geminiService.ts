
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
  }

  async refineText(text: string): Promise<string> {
    const ai = this.getClient();
    try {
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

      return response.text?.trim() || text;
    } catch (error) {
      console.error("Gemini text refinement error:", error);
      throw new Error("Failed to refine text");
    }
  }
}

export const geminiService = new GeminiService();
