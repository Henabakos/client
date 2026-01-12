
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private getClient() {
    return new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
  }

  async refineText(text: string): Promise<string> {
    const genAI = this.getClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
      const result = await model.generateContent([
        "Refine and improve the following message to make it clearer, more professional, and well-written. Keep the same meaning and intent. Only return the refined text, nothing else. If the text is already good, return it as is with minor improvements if needed.",
        `Original message: "${text}"`,
        "Refined message:"
      ]);

      const response = await result.response;
      return response.text().trim() || text;
    } catch (error: any) {
      console.error("Gemini text refinement error:", error);
      // Re-throw the original error to preserve status codes like 429
      throw error;
    }
  }

  async chat(message: string, history: { role: 'user' | 'model'; parts: string }[]): Promise<string> {
    const genAI = this.getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are ChatFlow AI, a helpful and friendly AI assistant integrated into a modern chat application. Your goal is to assist users with their questions, provide information, and engage in meaningful conversations. Keep your responses concise but helpful, matching the tone of a real-time chat. Do not use markdown like # for headers, use bold or plain text instead to keep it readable in a chat bubble."
    });

    try {
      const chatSession = model.startChat({
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }]
        })),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chatSession.sendMessage(message);
      const response = await result.response;
      return response.text().trim();
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      // Re-throw the original error to preserve status codes like 429
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
