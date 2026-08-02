import type { Request, Response } from 'express';
import type { AssistantRequest } from './types.js';
import { getAiHealth, isAiAssistantEnabled, resolveAssistantMessage } from './aiService.js';

function shouldLogAi(): boolean {
  return process.env.AI_DEBUG_LOGS !== 'false';
}

function aiLog(event: string, meta?: Record<string, unknown>): void {
  if (!shouldLogAi()) return;
  if (meta) {
    console.log(`[AI][Controller] ${event}`, meta);
    return;
  }
  console.log(`[AI][Controller] ${event}`);
}

export async function health(_req: Request, res: Response): Promise<void> {
  const info = getAiHealth();
  aiLog('health', info);
  res.json({ success: true, ...info, timestamp: new Date().toISOString() });
}

export async function assistant(req: Request, res: Response): Promise<void> {
  try {
    const body = (req.body || {}) as Partial<AssistantRequest>;
    const msg = typeof body.message === 'string' ? body.message.trim() : '';
    aiLog('request.received', {
      messageLength: msg.length,
      hasContext: Boolean(body.context),
      hasSessionId: typeof body.sessionId === 'string' && body.sessionId.trim().length > 0,
    });

    if (typeof body.message !== 'string' || body.message.trim().length < 2) {
      aiLog('request.invalid', { reason: 'message-too-short' });
      res.status(400).json({
        success: false,
        policy: 'blocked',
        message: 'El campo "message" debe tener al menos 2 caracteres.',
        action: 'none',
        params: {},
        traceId: 'invalid-request',
      });
      return;
    }

    if (!isAiAssistantEnabled()) {
      aiLog('request.rejected', { reason: 'assistant-disabled' });
      res.json({
        success: false,
        policy: 'blocked',
        message: 'El asistente IA esta desactivado en este entorno.',
        action: 'none',
        params: {},
        traceId: 'assistant-disabled',
      });
      return;
    }

    const response = await resolveAssistantMessage(body as AssistantRequest);
    aiLog('response.sent', {
      traceId: response.traceId,
      success: response.success,
      policy: response.policy,
      action: response.action,
    });
    res.json(response);
  } catch (error) {
    console.error('[AI] Error en assistant:', error);
    res.status(500).json({
      success: false,
      policy: 'blocked',
      message: 'Ocurrio un error interno al procesar la solicitud del asistente.',
      action: 'none',
      params: {},
      traceId: 'assistant-error',
    });
  }
}
