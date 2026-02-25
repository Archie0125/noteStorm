import { GoogleGenAI } from "@google/genai";
import { AIPersona } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const DEFAULT_PERSONAS: AIPersona[] = [
  {
    id: 'editor',
    name: 'Editor',
    role: 'Professional Editor',
    tone: 'Critical, constructive, focused on structure and clarity.',
    color: '#3b82f6' // blue-500
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    role: 'Creative Consultant',
    tone: 'Inspiring, imaginative, suggests metaphors and vivid language.',
    color: '#8b5cf6' // violet-500
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    role: 'Devil\'s Advocate',
    tone: 'Questioning, points out logical gaps and potential counter-arguments.',
    color: '#ef4444' // red-500
  }
];

export async function generateAIComments(text: string, personas: AIPersona[] = DEFAULT_PERSONAS): Promise<{ personaId: string, content: string }[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API Key is missing. Returning mock response.");
    return personas.map(p => ({
      personaId: p.id,
      content: `[Mock AI Response for ${p.name}] This is a simulated response because the API key is missing. Please configure your API key.`
    }));
  }

  try {
    const prompt = `
      You are a team of blog editors reviewing a draft section.
      The text is: "${text}"

      Please provide feedback from the following perspectives:
      ${personas.map(p => `- ${p.name} (${p.role}): ${p.tone}`).join('\n')}

      Return the response as a JSON array where each object has "personaId" (matching the input IDs: ${personas.map(p => p.id).join(', ')}) and "content" (the feedback).
      Do not include markdown code blocks in the response, just the raw JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    
    const responseText = response.text || '';
    
    // Clean up potential markdown code blocks if the model adds them
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating AI comments:", error);
    return [{
      personaId: 'system',
      content: "Error generating comments. Please try again."
    }];
  }
}
