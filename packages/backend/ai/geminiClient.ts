import type { AiAction } from './types.js';

interface GeminiNarrationInput {
  userMessage: string;
  fallbackMessage: string;
  preferredAction: AiAction;
  toolSummary: string;
}

export async function generateNarrationWithGemini(input: GeminiNarrationInput): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  const enabled = process.env.AI_USE_GEMINI !== 'false';

  if (!enabled || !key) return null;

  const fetchFn = (globalThis as any).fetch as ((...args: any[]) => Promise<any>) | undefined;
  if (!fetchFn) return null;

  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || '12000');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const prompt = [
    'Eres un asistente de navegacion farmacéutica de una web.',
    'Nunca des dosis, diagnosticos ni tratamiento.',
    'Redacta en espanol neutral, maximo 70 palabras, tono claro.',
    'Usuario: ' + input.userMessage,
    'Accion sugerida: ' + input.preferredAction,
    'Datos utiles: ' + input.toolSummary,
    'Respuesta base: ' + input.fallbackMessage,
  ].join('\n');

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 180,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') return null;

    return text.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
