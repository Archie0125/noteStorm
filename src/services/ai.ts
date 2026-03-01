import { GoogleGenAI } from "@google/genai";
import { AIPersona } from "../types";

export const FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
] as const;

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GeminiModelInfo {
  id: string;
  name: string;
}

export async function fetchModelsFromGoogle(apiKey: string): Promise<GeminiModelInfo[]> {
  const key = apiKey?.trim();
  if (!key) return [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const models = (data.models || []) as Array<{ name: string; displayName?: string }>;
    return models
      .filter((m) => m.name && m.name.startsWith('models/'))
      .map((m) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
      }))
      .filter((m) => m.id.includes('gemini') && !m.id.includes('embedding'))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export const DEFAULT_PERSONAS: AIPersona[] = [
  {
    id: 'socrates',
    name: 'Socrates',
    role: 'Philosopher & Questioner',
    tone: 'Uses the Socratic method. Never gives answers—only probing questions that expose logical gaps and hidden assumptions. Curiosity, humility, and sharp wit. Guide the writer to their own clarity through inquiry. Respond in the same language as the draft.',
    color: '#3b82f6' // blue-500
  },
  {
    id: 'emily',
    name: 'Emily Dickinson',
    role: 'Poet of Precision',
    tone: 'Every word must earn its place. Suggest concision, precision, and the power of omission. Poetic economy—what can be cut? What silence would speak louder? Enigmatic, spare, leaves room for the reader. Respond in the same language as the draft.',
    color: '#8b5cf6' // violet-500
  },
  {
    id: 'orwell',
    name: 'George Orwell',
    role: 'Champion of Plain Language',
    tone: 'Plain language. No jargon, no euphemism, no pretension. "Good prose is like a windowpane." Direct, honest, cuts through fluff. Where is the writer hiding behind vague words? Demand clarity and intellectual honesty. Respond in the same language as the draft.',
    color: '#ef4444' // red-500
  }
];

export async function generateAIComments(
  text: string, 
  personas: AIPersona[] = DEFAULT_PERSONAS,
  customApiKey?: string,
  model: string = DEFAULT_MODEL
): Promise<{ personaId: string, content: string }[]> {
  const apiKey = (customApiKey?.trim() || process.env.GEMINI_API_KEY)?.trim();
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Returning mock response.");
    const msg = {
      en: 'Please set Gemini API Key in settings to use AI feedback.',
      'zh-TW': '請在設定中輸入 Gemini API Key 以使用 AI 點評功能。',
    };
    const locale = (typeof window !== 'undefined' && (localStorage.getItem('noteStorm_locale') as 'en' | 'zh-TW')) || 'en';
    const text = msg[locale] ?? msg['zh-TW'];
    return personas.map(p => ({ personaId: p.id, content: `[${p.name}] ${text}` }));
  }

  const aiClient = new GoogleGenAI({ apiKey });

  try {
    const personaIds = personas.map(p => p.id);
    const prompt = `
You are a panel of ${personas.length} historical figures reviewing a draft. You MUST respond with exactly ${personas.length} entries, one per persona, in this order.

Draft content (between ---):
---
${text}
---

Personas (respond in the same language as the draft):
${personas.map((p, i) => `${i + 1}. ${p.name} (id: ${p.id}, ${p.role}): ${p.tone}`).join('\n')}

Return a JSON array with exactly ${personas.length} objects. Each object: {"personaId": "<id>", "content": "<that persona's feedback>"}
Required personaIds in order: ${personaIds.join(', ')}
Raw JSON only, no Markdown.
    `.trim();

    const response = await aiClient.models.generateContent({
      model: model || DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const responseText = response.text || '';
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON response');
    }
    const comments = Array.isArray(parsed) ? parsed as { personaId: string; content: string }[] : [];
    
    // Ensure all personas have a response (fill missing with fallback)
    const byId = new Map(comments.map(c => [c.personaId, c]));
    return personas.map(p => {
      const c = byId.get(p.id);
      return c ? { personaId: p.id, content: c.content } : { personaId: p.id, content: `[${p.name}] No response generated.` };
    });
  } catch (error) {
    console.error("Error generating AI comments:", error);
    return personas.map(p => ({
      personaId: p.id,
      content: `[${p.name}] Error generating comments. Please try again.`
    }));
  }
}
