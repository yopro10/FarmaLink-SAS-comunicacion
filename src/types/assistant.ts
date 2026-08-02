import type { Sugerencia, View } from './index';

export type AssistantPolicy = 'allowed' | 'blocked';

export type AssistantAction =
  | 'none'
  | 'go_home'
  | 'go_search'
  | 'go_product'
  | 'go_compare'
  | 'go_history'
  | 'go_map'
  | 'go_dashboard'
  | 'go_category'
  | 'go_cart'
  | 'go_developers'
  | 'go_about'
  | 'go_faq';

export interface AssistantOption {
  id: string;
  label: string;
  action: AssistantAction;
  params?: {
    query?: string;
    medicamentoId?: number;
    medicamento?: Sugerencia;
    lat?: number;
    lng?: number;
    [key: string]: unknown;
  };
}

export interface AssistantContext {
  currentView?: View;
  isAuthenticated?: boolean;
  userRole?: string;
  lat?: number;
  lng?: number;
}

export interface AssistantRequestPayload {
  sessionId?: string;
  message: string;
  context?: AssistantContext;
}

export interface AssistantResponsePayload {
  success: boolean;
  policy: AssistantPolicy;
  message: string;
  action: AssistantAction;
  requiresConfirmation?: boolean;
  options?: AssistantOption[];
  params: {
    query?: string;
    medicamentoId?: number;
    medicamento?: Sugerencia;
    lat?: number;
    lng?: number;
    [key: string]: unknown;
  };
  data?: Record<string, unknown>;
  traceId: string;
}

export interface AssistantPriceItem {
  precioId: number;
  farmaciaId: number;
  farmaciaNombre: string;
  farmaciaDireccion: string;
  precio: number;
  fecha: string;
}

export interface AssistantPriceInsights {
  bestPrice?: AssistantPriceItem | null;
  maxPrice?: AssistantPriceItem | null;
  savings?: number;
}

export interface AssistantPresentationPanel {
  medicine: Sugerencia;
  prices: AssistantPriceItem[];
  priceInsights: AssistantPriceInsights;
  topPharmacies: AssistantPriceItem[];
  options: AssistantOption[];
}

export interface AssistantPreviewData {
  intent?: string;
  query?: string;
  primaryMedicine?: Sugerencia;
  matches?: Sugerencia[];
  prices?: AssistantPriceItem[];
  priceInsights?: AssistantPriceInsights;
  presentationPanels?: AssistantPresentationPanel[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  policy?: AssistantPolicy;
  options?: AssistantOption[];
  traceId?: string;
  preview?: AssistantPreviewData;
}
