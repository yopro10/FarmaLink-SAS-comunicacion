import { randomUUID } from 'crypto';
import { evaluatePolicy } from './policyGuard.js';
import {
  comparePrices,
  getNearbyPharmacies,
  getPriceHistory,
  searchMedicines,
  toAssistantSuggestion,
} from './tools.js';
import type {
  AssistantOption,
  AssistantIntent,
  AssistantRequest,
  AssistantResponse,
  ToolMedicine,
  ToolPriceItem,
} from './types.js';

function shouldLogAi(): boolean {
  return process.env.AI_DEBUG_LOGS !== 'false';
}

function aiLog(event: string, meta?: Record<string, unknown>): void {
  if (!shouldLogAi()) return;
  if (meta) {
    console.log(`[AI][Service] ${event}`, meta);
    return;
  }
  console.log(`[AI][Service] ${event}`);
}

export function isAiAssistantEnabled(): boolean {
  return process.env.ENABLE_AI_ASSISTANT === 'true';
}

export function getAiHealth() {
  const enabled = isAiAssistantEnabled();
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';

  return {
    enabled,
    hasGeminiKey: hasKey,
    model,
  };
}

interface SemanticExtraction {
  intent: AssistantIntent;
  queryCandidates: string[];
}

interface ModelPolicyEvaluation {
  blocked: boolean;
  reason: string;
  category: string;
}

type NavigationAction =
  | 'go_map'
  | 'go_home'
  | 'go_search'
  | 'go_dashboard'
  | 'go_category'
  | 'go_cart'
  | 'go_developers'
  | 'go_about'
  | 'go_faq';

function isKnownIntent(value: string): value is AssistantIntent {
  return ['greeting', 'search', 'product', 'compare', 'history', 'map', 'unknown'].includes(value);
}

function uniqueCandidates(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length >= 2)));
}

function detectNavigationTargets(message: string): NavigationAction[] {
  const plain = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const targets: NavigationAction[] = [];

  if (/\b(mapa|ubicacion|farmacias cerca|cerca)\b/.test(plain)) {
    targets.push('go_map');
  }
  if (/\b(inicio|home|volver|regresar|menu principal|menu)\b/.test(plain)) {
    targets.push('go_home');
  }
  if (/\b(buscar|busqueda|busqueda|buscar productos)\b/.test(plain)) {
    targets.push('go_search');
  }
  if (/\b(dashboard|tablero|panel)\b/.test(plain)) {
    targets.push('go_dashboard');
  }
  if (/\b(categoria|categorias)\b/.test(plain)) {
    targets.push('go_category');
  }
  if (/\b(carrito|cart|mi carrito|compras)\b/.test(plain)) {
    targets.push('go_cart');
  }
  if (/\b(equipo|desarrolladores|developers)\b/.test(plain)) {
    targets.push('go_developers');
  }
  if (/\b(quienes somos|quienes-somos|acerca|sobre nosotros|about)\b/.test(plain)) {
    targets.push('go_about');
  }
  if (/\b(faq|preguntas frecuentes|ayuda|faa)\b/.test(plain)) {
    targets.push('go_faq');
  }

  return Array.from(new Set(targets));
}

function buildNavigationOptions(targets: NavigationAction[]): AssistantOption[] {
  const map: Record<NavigationAction, AssistantOption> = {
    go_map: { id: 'go-map', label: 'Ver mapa de farmacias', action: 'go_map', params: {} },
    go_home: { id: 'go-home', label: 'Ir a inicio', action: 'go_home', params: {} },
    go_search: { id: 'go-search', label: 'Ir a buscar', action: 'go_search', params: {} },
    go_dashboard: { id: 'go-dashboard', label: 'Ir al dashboard', action: 'go_dashboard', params: {} },
    go_category: { id: 'go-category', label: 'Ver categorias', action: 'go_category', params: {} },
    go_cart: { id: 'go-cart', label: 'Ver mi carrito', action: 'go_cart', params: {} },
    go_developers: { id: 'go-developers', label: 'Ir al equipo', action: 'go_developers', params: {} },
    go_about: { id: 'go-about', label: 'Ir a quienes somos', action: 'go_about', params: {} },
    go_faq: { id: 'go-faq', label: 'Ir al FAQ', action: 'go_faq', params: {} },
  };

  return targets.map((target) => map[target]);
}

function buildNavigationResponse(traceId: string, targets: NavigationAction[]): AssistantResponse {
  const options = buildNavigationOptions(targets);
  const labelList = options.map((item) => item.label).join(', ');

  if (targets.length === 1 && options.length === 1) {
    const selected = options[0];
    return {
      success: true,
      policy: 'allowed',
      message: `Perfecto, te llevo a: ${selected.label}.`,
      action: selected.action,
      params: selected.params || {},
      requiresConfirmation: false,
      options,
      data: { navigationTargets: targets, autoNavigate: true },
      traceId,
    };
  }

  return {
    success: true,
    policy: 'allowed',
    message: `Entendi que quieres navegar a: ${labelList}. Cual opcion quieres abrir ahora?`,
    action: 'none',
    params: {},
    requiresConfirmation: true,
    options,
    data: { navigationTargets: targets },
    traceId,
  };
}

async function extractSemanticsWithModel(message: string): Promise<SemanticExtraction | null> {
  if (process.env.AI_USE_GEMINI === 'false') return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 5000);

  const prompt = [
    'Extrae intencion y terminos de busqueda en espanol.',
    'Responde SOLO JSON valido con formato:',
    '{"intent":"greeting|search|product|compare|history|map|unknown","queryCandidates":["..."]}',
    'Reglas:',
    '- Corrige typos de medicamentos cuando sea obvio.',
    '- En queryCandidates devuelve solo terminos utiles (sin palabras de relleno como "quiero", "que", "hay", "saber", "por favor").',
    '- Si piden historico/historial/evolucion/tendencia de precio, usa intent=history.',
    '- Si preguntan por precio, usa intent=compare.',
    '- Si es saludo puro, usa intent=greeting y queryCandidates=[].',
    `Mensaje: "${message}"`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string' || rawText.trim().length === 0) return null;

    const parsed = JSON.parse(rawText);
    const rawIntent = typeof parsed?.intent === 'string' ? parsed.intent.toLowerCase().trim() : 'unknown';
    const rawCandidates = Array.isArray(parsed?.queryCandidates)
      ? parsed.queryCandidates.map((item: unknown) => String(item || ''))
      : [];

    const sanitizedCandidates = uniqueCandidates(
      rawCandidates
        .map((item) => normalizeSearchQuery(item))
        .filter((item) => item.length >= 2)
    );

    return {
      intent: isKnownIntent(rawIntent) ? rawIntent : 'unknown',
      queryCandidates: sanitizedCandidates,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function evaluatePolicyWithModel(message: string): Promise<ModelPolicyEvaluation | null> {
  if (process.env.AI_USE_GEMINI === 'false') return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 5000);

  const prompt = [
    'Evalua si el siguiente mensaje debe ser bloqueado por seguridad sanitaria.',
    'Responde SOLO JSON valido con este formato exacto:',
    '{"blocked":true|false,"reason":"...","category":"automedicacion|diagnostico|dosis|sintomas|none"}',
    'Bloquea cuando el usuario solicite o implique: automedicacion, diagnostico, dosis, o tratamiento por sintomas.',
    'Si no hay riesgo, usa blocked=false, reason="", category="none".',
    `Mensaje: "${message}"`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string' || rawText.trim().length === 0) return null;

    const parsed = JSON.parse(rawText);
    const blocked = Boolean(parsed?.blocked);
    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : '';
    const category = typeof parsed?.category === 'string' ? parsed.category.trim().toLowerCase() : 'none';

    return {
      blocked,
      reason,
      category,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function detectIntent(message: string): AssistantIntent {
  const text = message.toLowerCase();
  const plain = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\b(hola|buenas|hello|hey|que tal|como vas|holi)\b/i.test(plain)) {
    return 'greeting';
  }

  if (/\b(historial|historico|historica|evolucion|cambio de preci\w+|tendencia)\b/i.test(plain)) {
    return 'history';
  }

  if (/\b(comparar|comparacion|mas barato|precio mas bajo|precio mas barato|donde consigo|donde encuentro|preci\w+|cuanto cuesta|valor)\b/i.test(plain)) {
    return 'compare';
  }

  if (/\b(mapa|cerca|cercana|cercano|farmacia cerca|ubicacion|ruta|dashboard|categoria|categorias|carrito|cart)\b/i.test(plain)) {
    return 'map';
  }

  if (/\b(descripcion|detalle|informacion|ficha|datos)\b/i.test(plain)) {
    return 'product';
  }

  if (/\b(buscar|quiero ver|mostrar|encontrar|marca|medicamento|necesito|saber)\b/i.test(plain)) {
    return 'search';
  }

  return 'unknown';
}

function normalizeSearchQuery(message: string): string {
  const typoMap: Record<string, string> = {
    acetaminofe: 'acetaminofen',
    acetaminfoen: 'acetaminofen',
    acetaminofen: 'acetaminofen',
    acetaminofem: 'acetaminofen',
    preicion: 'precio',
    precion: 'precio',
    uun: 'un',
    aseaminofen: 'acetaminofen',
  };

  const stopwords = new Set([
    'quiero',
    'quisiera',
    'necesito',
    'podrias',
    'podria',
    'puedes',
    'me',
    'gustaria',
    'ver',
    'mostrar',
    'muestrame',
    'buscar',
    'busca',
    'encontrar',
    'comparar',
    'compara',
    'comparador',
    'precio',
    'precios',
    'precion',
    'historial',
    'historico',
    'historica',
    'detalle',
    'descripcion',
    'informacion',
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'por',
    'favor',
    'porfa',
    'farmacia',
    'farmacias',
    'mapa',
    'cerca',
    'cercana',
    'cercano',
    'ubicacion',
    'ruta',
    'saber',
    'que',
    'q',
    'hay',
    'cual',
    'cuales',
    'existe',
    'existen',
    'tener',
    'tienes',
    'tengo',
    'alguno',
    'algunos',
    'alguna',
    'algunas',
    'quiera',
    'cuanto',
    'cuesta',
    'valor',
    'un',
    'una',
    'unos',
    'unas',
  ]);

  const normalizedInput = message
    .replace(/(\d+)\s+(mg|ml|mcg|g|gr)\b/gi, '$1$2');

  const tokens = normalizedInput
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[?!.,;:()\[\]{}"']/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/(.)\1{2,}/g, '$1$1'))
    .map((token) => typoMap[token] || token)
    .filter((token) => token.length > 0)
    .filter((token) => {
      if (/^\d+(mg|ml|gr)?$/.test(token)) return true;
      if (stopwords.has(token)) return false;
      return token.length >= 3;
    });

  return tokens.join(' ').trim();
}

function extractSearchCandidates(message: string): string[] {
  const normalized = normalizeSearchQuery(message);
  const tokens = normalized.split(' ').filter(Boolean);
  const candidates: string[] = [];

  if (normalized.length >= 2) {
    candidates.push(normalized);
  }

  if (tokens.length >= 3) {
    candidates.push(tokens.slice(-3).join(' '));
  }

  if (tokens.length >= 2) {
    candidates.push(tokens.slice(-2).join(' '));
  }

  for (const token of tokens) {
    if (token.length >= 4) {
      candidates.push(token);
    }
  }

  const fallback = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;:()\[\]{}"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (fallback.length >= 2) {
    candidates.push(fallback);
  }

  return Array.from(new Set(candidates)).filter((item) => item.length >= 2);
}

function expandQueryCandidates(baseCandidates: string[]): string[] {
  const expanded: string[] = [];

  for (const candidate of baseCandidates) {
    expanded.push(candidate);

    const withoutDose = candidate
      .replace(/\b\d+\s?(mg|ml|gr|g|mcg)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (withoutDose.length >= 2 && withoutDose !== candidate) {
      expanded.push(withoutDose);
    }

    const lowered = candidate.toLowerCase();
    if (lowered.includes('dolor') && lowered.includes('cabeza')) {
      expanded.push('acetaminofen');
      expanded.push('ibuprofeno');
      expanded.push('analgesico');
    }
  }

  return uniqueCandidates(expanded);
}

function isDoseOnlyCandidate(candidate: string): boolean {
  const tokens = candidate
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return false;

  return tokens.every((token) => /^\d+(mg|ml|gr|g|mcg)$/.test(token));
}

function hasAlphaMedicationSignal(candidate: string): boolean {
  const tokens = candidate
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return tokens.some((token) => /[a-z]/.test(token) && token.length >= 4);
}

function mergeMedicinesUnique(first: ToolMedicine[], second: ToolMedicine[], limit = 6): ToolMedicine[] {
  const merged = [...first];
  const seen = new Set(first.map((item) => item.id));

  for (const item of second) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}

function getPrimaryMedicine(medicines: ToolMedicine[]): ToolMedicine | null {
  if (medicines.length === 0) return null;
  return medicines[0];
}

function formatCop(value: number): string {
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function summarizePrices(prices: ToolPriceItem[]) {
  if (prices.length === 0) {
    return {
      bestPrice: null,
      maxPrice: null,
      savings: 0,
      topLines: [] as string[],
    };
  }

  const best = prices[0];
  const worst = prices[prices.length - 1];
  const savings = Math.max(0, Number(worst.precio) - Number(best.precio));
  const topLines = prices.slice(0, 3).map((item, index) => {
    const rank = index + 1;
    const address = item.farmaciaDireccion ? ` - ${item.farmaciaDireccion}` : '';
    return `${rank}. ${item.farmaciaNombre}: ${formatCop(item.precio)}${address}`;
  });

  return {
    bestPrice: best,
    maxPrice: worst,
    savings,
    topLines,
  };
}

interface PresentationPanelData {
  medicine: ToolMedicine;
  prices: ToolPriceItem[];
}

async function buildPresentationPanels(
  medicines: ToolMedicine[],
  intent: AssistantIntent,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const targets = medicines.slice(0, 5);
  const withPrices: PresentationPanelData[] = await Promise.all(
    targets.map(async (medicine) => ({
      medicine,
      prices: await comparePrices(medicine.id),
    }))
  );

  return withPrices.map(({ medicine, prices }) => {
    const suggestion = toAssistantSuggestion(medicine);
    const insights = summarizePrices(prices);
    const panelParams: Record<string, unknown> = {
      medicamentoId: suggestion.id,
      medicamento: suggestion,
    };

    return {
      medicine: suggestion,
      prices,
      priceInsights: {
        bestPrice: insights.bestPrice,
        maxPrice: insights.maxPrice,
        savings: insights.savings,
      },
      topPharmacies: prices.slice(0, 3),
      options: buildActionOptions(intent, query, panelParams),
    };
  });
}

function buildActionOptions(
  intent: AssistantIntent,
  query: string,
  baseParams: Record<string, unknown>
): AssistantOption[] {
  const optionsByKey: Record<string, AssistantOption> = {
    compare: {
      id: 'go-compare',
      label: 'Ver comparador',
      action: 'go_compare',
      params: baseParams,
    },
    product: {
      id: 'go-product',
      label: 'Ver ficha del medicamento',
      action: 'go_product',
      params: baseParams,
    },
    history: {
      id: 'go-history',
      label: 'Ver historial de precios',
      action: 'go_history',
      params: baseParams,
    },
    map: {
      id: 'go-map',
      label: 'Ver mapa del medicamento',
      action: 'go_map',
      params: baseParams,
    },
  };

  const orderByIntent: Record<AssistantIntent, string[]> = {
    greeting: ['map'],
    compare: ['compare', 'product', 'history', 'map'],
    history: ['history', 'compare', 'product', 'map'],
    map: ['map'],
    product: ['product', 'compare', 'history', 'map'],
    search: ['compare', 'product', 'history', 'map'],
    unknown: ['compare', 'product', 'history', 'map'],
  };

  return orderByIntent[intent]
    .map((key) => optionsByKey[key])
    .filter(Boolean);
}

function buildNoResultsResponse(traceId: string, query: string, intent: AssistantIntent): AssistantResponse {
  const fallbackOptions: AssistantOption[] = [
    { id: 'go-home', label: 'Ir a inicio', action: 'go_home', params: {} },
    { id: 'go-search', label: 'Ir a buscar', action: 'go_search', params: {} },
    { id: 'go-map', label: 'Ver mapa de farmacias', action: 'go_map', params: {} },
    { id: 'go-category', label: 'Ver categorias', action: 'go_category', params: {} },
    { id: 'go-dashboard', label: 'Ir al dashboard', action: 'go_dashboard', params: {} },
    { id: 'go-cart', label: 'Ver mi carrito', action: 'go_cart', params: {} },
    { id: 'go-developers', label: 'Ir al equipo', action: 'go_developers', params: {} },
    { id: 'go-about', label: 'Ir a quienes somos', action: 'go_about', params: {} },
    { id: 'go-faq', label: 'Ir al FAQ', action: 'go_faq', params: {} },
  ];

  return {
    success: true,
    policy: 'allowed',
    message:
      `No encontre coincidencias claras para "${query}". ` +
      'Prueba con nombre comercial, principio activo, categoria o dosis (por ejemplo: acetaminofen 500mg).',
    action: 'none',
    params: { query },
    requiresConfirmation: true,
    options: fallbackOptions,
    data: { matches: [], intent, query },
    traceId,
  };
}

function buildGuidedMedicationResponse(
  traceId: string,
  intent: AssistantIntent,
  query: string,
  medicines: ToolMedicine[],
  primary: ToolMedicine,
  presentationPanels: Array<Record<string, unknown>>,
  extraData: Record<string, unknown> = {}
): AssistantResponse {
  const primarySuggestion = toAssistantSuggestion(primary);
  const baseParams: Record<string, unknown> = {
    medicamentoId: primarySuggestion.id,
    medicamento: primarySuggestion,
  };

  const primaryPanel =
    presentationPanels.find((panel) => Number((panel.medicine as any)?.id) === Number(primarySuggestion.id)) ||
    presentationPanels[0] ||
    null;

  const primaryPrices = Array.isArray(primaryPanel?.prices) ? (primaryPanel?.prices as ToolPriceItem[]) : [];
  const { bestPrice, maxPrice, savings } = summarizePrices(primaryPrices);
  const messageLines: string[] = [
    `Entendi tu intencion como "${intent}" y busque "${query}".`,
    `Encontre ${medicines.length} presentacion(es) relacionada(s).`,
  ];

  messageLines.push(`Principal sugerido: ${primarySuggestion.name}.`);

  if (primarySuggestion.description) {
    messageLines.push(`Descripcion breve: ${primarySuggestion.description.slice(0, 140)}.`);
  }

  if (bestPrice) {
    messageLines.push(`Mejor precio del principal: ${formatCop(bestPrice.precio)} en ${bestPrice.farmaciaNombre}.`);
  }

  if (maxPrice && savings > 0) {
    messageLines.push(`Ahorro del principal: ${formatCop(savings)} frente al precio mas alto.`);
  }

  messageLines.push('Te muestro paneles por cada presentacion encontrada para que elijas.');

  const autoAction = intent === 'history'
    ? 'go_history'
    : intent === 'compare'
      ? 'go_compare'
      : intent === 'product'
        ? 'go_product'
        : 'none';

  return {
    success: true,
    policy: 'allowed',
    message: messageLines.join('\n\n'),
    action: autoAction,
    params: { query, ...baseParams },
    requiresConfirmation: autoAction === 'none',
    options: buildActionOptions(intent, query, baseParams),
    data: {
      ...extraData,
      prices: primaryPrices,
      query,
      intent,
      matches: medicines.map(toAssistantSuggestion),
      primaryMedicine: primarySuggestion,
      presentationPanels,
      priceInsights: {
        bestPrice,
        maxPrice,
        savings,
      },
    },
    traceId,
  };
}

export async function resolveAssistantMessage(payload: AssistantRequest): Promise<AssistantResponse> {
  const traceId = randomUUID();
  const rawMessage = String(payload.message || '').trim();
  const context = payload.context || {};
  const messagePreview = rawMessage.replace(/\s+/g, ' ').slice(0, 80);

  aiLog('request.start', {
    traceId,
    sessionId: payload.sessionId || null,
    messagePreview,
    hasCoordinates: Number.isFinite(context.lat) && Number.isFinite(context.lng),
  });

  if (!rawMessage) {
    aiLog('request.empty', { traceId });
    return {
      success: false,
      policy: 'blocked',
      message: 'Necesito que escribas una consulta para poder ayudarte.',
      action: 'none',
      params: {},
      traceId,
    };
  }

  const rulePolicy = evaluatePolicy(rawMessage);
  const modelPolicy = await evaluatePolicyWithModel(rawMessage);
  const blockedByModel = Boolean(modelPolicy?.blocked);
  const blockedByRule = rulePolicy.blocked;

  if (blockedByModel || blockedByRule) {
    const reason = blockedByModel
      ? modelPolicy?.reason || 'Consulta bloqueada por politicas de seguridad sanitaria.'
      : rulePolicy.reason;

    aiLog('policy.blocked', {
      traceId,
      source: blockedByModel ? 'model+rules' : 'rules',
      reason,
      modelCategory: modelPolicy?.category || 'none',
    });

    return {
      success: true,
      policy: 'blocked',
      message: `Solicitud cancelada y denegada por seguridad. ${reason}`,
      action: 'none',
      params: {},
      data: {
        reason,
        policySource: blockedByModel ? 'model+rules' : 'rules',
        modelCategory: modelPolicy?.category || 'none',
      },
      traceId,
    };
  }

  const semantic = await extractSemanticsWithModel(rawMessage);
  const fallbackIntent = detectIntent(rawMessage);
  const intent = semantic && semantic.intent !== 'unknown' ? semantic.intent : fallbackIntent;
  const navigationTargets = detectNavigationTargets(rawMessage);

  if (navigationTargets.length > 1 || (navigationTargets.length === 1 && navigationTargets[0] !== 'go_map')) {
    aiLog('navigation.targets_detected', {
      traceId,
      targets: navigationTargets,
    });
    return buildNavigationResponse(traceId, navigationTargets);
  }

  if (intent === 'greeting') {
    aiLog('intent.greeting', { traceId });
    return {
      success: true,
      policy: 'allowed',
      message:
        'Hola. Entendi tu saludo. Escribeme un medicamento y te muestro precios, farmacias y opciones para elegir. Ejemplo: "Quiero ver acetaminofen 500mg".',
      action: 'none',
      params: {},
      requiresConfirmation: true,
      options: [
        { id: 'go-search', label: 'Ir a busqueda', action: 'go_search', params: {} },
        { id: 'go-map', label: 'Ver mapa de farmacias', action: 'go_map', params: {} },
      ],
      traceId,
    };
  }

  const fallbackCandidates = extractSearchCandidates(rawMessage);
  const queryCandidates = semantic && semantic.queryCandidates.length > 0
    ? uniqueCandidates([...semantic.queryCandidates, ...fallbackCandidates])
    : fallbackCandidates;
  const expandedCandidates = expandQueryCandidates(queryCandidates);
  const query = expandedCandidates[0] || rawMessage;

  aiLog('intent.resolved', {
    traceId,
    source: semantic ? 'model+regex' : 'regex',
    intent,
    queryCandidates,
    expandedCandidates,
  });

  if (intent === 'map') {
    const hasCoordinates = Number.isFinite(context.lat) && Number.isFinite(context.lng);

    let mapMedicines: ToolMedicine[] = [];
    let mapQueryUsed = query;

    for (const candidate of expandedCandidates) {
      const found = await searchMedicines(candidate, 3);
      if (found.length === 0) continue;
      mapMedicines = found;
      mapQueryUsed = candidate;
      break;
    }

    const mapPrimary = getPrimaryMedicine(mapMedicines);
    if (mapPrimary) {
      const suggestion = toAssistantSuggestion(mapPrimary);
      aiLog('action.map_medication_context', {
        traceId,
        query: mapQueryUsed,
        medicamentoId: suggestion.id,
        medicamentoNombre: suggestion.name,
        hasCoordinates,
      });

      return {
        success: true,
        policy: 'allowed',
        message: `Perfecto. Te llevare al mapa para ${suggestion.name} en 5 segundos.`,
        action: 'go_map',
        params: {
          query: mapQueryUsed,
          medicamentoId: suggestion.id,
          medicamento: suggestion,
          ...(hasCoordinates ? { lat: Number(context.lat), lng: Number(context.lng) } : {}),
        },
        requiresConfirmation: false,
        options: [
          {
            id: 'go-map-medication',
            label: `Ver mapa de ${suggestion.name}`,
            action: 'go_map',
            params: {
              query: mapQueryUsed,
              medicamentoId: suggestion.id,
              medicamento: suggestion,
              ...(hasCoordinates ? { lat: Number(context.lat), lng: Number(context.lng) } : {}),
            },
          },
        ],
        data: {
          intent,
          query: mapQueryUsed,
          matches: mapMedicines.map(toAssistantSuggestion),
          primaryMedicine: suggestion,
        },
        traceId,
      };
    }

    if (!hasCoordinates) {
      aiLog('action.map_without_coordinates', { traceId });
      return {
        success: true,
        policy: 'allowed',
        message:
          'Perfecto. Te llevare al mapa de farmacias en 5 segundos. Si compartes ubicacion, tambien podre mostrarte cuales te quedan mas cerca.',
        action: 'go_map',
        params: {},
        requiresConfirmation: false,
        options: [{ id: 'go-map', label: 'Abrir mapa de farmacias', action: 'go_map', params: {} }],
        traceId,
      };
    }

    const nearby = await getNearbyPharmacies(Number(context.lat), Number(context.lng), 8);
    aiLog('action.map_with_coordinates', {
      traceId,
      nearbyCount: nearby.length,
      lat: Number(context.lat),
      lng: Number(context.lng),
    });

    const topNearby = nearby.slice(0, 3).map((item, index) => `${index + 1}. ${item.name} (${item.distance.toFixed(1)} km)`);
    const nearbyText = topNearby.length > 0
      ? `\nFarmacias cercanas:\n${topNearby.join('\n')}`
      : '\nNo encontre farmacias cercanas con la ubicacion actual.';

    return {
      success: true,
      policy: 'allowed',
      message: `Encontre ${nearby.length} farmacias cerca de ti.${nearbyText}\n\nTe llevare al mapa en 5 segundos.`,
      action: 'go_map',
      params: { lat: Number(context.lat), lng: Number(context.lng) },
      requiresConfirmation: false,
      options: [
        {
          id: 'go-map',
          label: 'Abrir mapa de farmacias',
          action: 'go_map',
          params: { lat: Number(context.lat), lng: Number(context.lng) },
        },
      ],
      data: { nearby },
      traceId,
    };
  }

  let medicines: ToolMedicine[] = [];
  let usedQuery = query;
  const queryHasMedicationSignal = hasAlphaMedicationSignal(query);

  for (const candidate of expandedCandidates) {
    if (queryHasMedicationSignal && isDoseOnlyCandidate(candidate)) {
      continue;
    }

    const found = await searchMedicines(candidate, 6);
    if (found.length === 0) continue;

    // Keep the first successful non-broad candidate to avoid drifting to unrelated 500mg results.
    medicines = found;
    usedQuery = candidate;
    break;
  }

  const primary = getPrimaryMedicine(medicines);

  aiLog('search.completed', {
    traceId,
    intent,
    query: usedQuery,
    queryCandidates,
    matches: medicines.length,
    primaryId: primary?.id || null,
    primaryName: primary?.name || null,
  });

  if ((intent === 'search' || intent === 'product' || intent === 'compare' || intent === 'history' || intent === 'unknown') && !primary) {
    aiLog('search.no_primary', { traceId, intent });
    return buildNoResultsResponse(traceId, usedQuery, intent);
  }
  const presentationPanels = await buildPresentationPanels(medicines, intent, usedQuery);

  if (intent === 'history') {
    const history = await getPriceHistory(primary!.id);
    aiLog('action.history', {
      traceId,
      medicamentoId: primary!.id,
      historyPoints: history.length,
    });

    return buildGuidedMedicationResponse(traceId, intent, usedQuery, medicines, primary!, presentationPanels, {
      history,
      historyPoints: history.length,
    });
  }

  if (intent === 'compare') {
    const primaryPanel = presentationPanels.find((panel) => Number((panel.medicine as any)?.id) === Number(primary!.id));
    const primaryPrices = Array.isArray(primaryPanel?.prices) ? (primaryPanel?.prices as ToolPriceItem[]) : [];
    aiLog('action.compare', {
      traceId,
      medicamentoId: primary!.id,
      pricesCount: primaryPrices.length,
      bestPrice: primaryPrices[0]?.precio || null,
    });

    return buildGuidedMedicationResponse(traceId, intent, usedQuery, medicines, primary!, presentationPanels);
  }

  if (intent === 'product') {
    aiLog('action.product', {
      traceId,
      medicamentoId: primary!.id,
      medicamento: primary!.name,
    });

    return buildGuidedMedicationResponse(traceId, intent, usedQuery, medicines, primary!, presentationPanels);
  }

  aiLog('action.default_guided', {
    traceId,
    intent,
    matches: medicines.length,
    medicamentoId: primary!.id,
    medicamento: primary!.name,
  });

  return buildGuidedMedicationResponse(traceId, intent, usedQuery, medicines, primary!, presentationPanels);
}
