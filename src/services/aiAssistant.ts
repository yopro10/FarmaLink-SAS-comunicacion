import type {
  AssistantRequestPayload,
  AssistantResponsePayload,
} from '../types/assistant';

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').trim();

export async function sendAssistantMessage(
  payload: AssistantRequestPayload
): Promise<AssistantResponsePayload> {
  const response = await fetch(`${API_BASE}/api/ai/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    return {
      success: false,
      policy: 'blocked',
      message: 'No pude procesar tu solicitud en este momento.',
      action: 'none',
      params: {},
      traceId: 'frontend-network-error',
    };
  }

  return data as AssistantResponsePayload;
}
