export type AiPolicy = 'allowed' | 'blocked';

export type AiAction =
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

export interface AssistantContext {
  currentView?: string;
  isAuthenticated?: boolean;
  userRole?: string;
  lat?: number;
  lng?: number;
}

export interface AssistantRequest {
  sessionId?: string;
  message: string;
  context?: AssistantContext;
}

export interface AssistantSuggestion {
  _id: string;
  id?: number;
  name: string;
  lab: string;
  category?: string;
  categoria_nombre?: string;
  description?: string;
  estrategiaUsada: string;
}

export interface AssistantResponse {
  success: boolean;
  policy: AiPolicy;
  message: string;
  action: AiAction;
  params: Record<string, unknown>;
  requiresConfirmation?: boolean;
  options?: AssistantOption[];
  data?: Record<string, unknown>;
  traceId: string;
}

export interface AssistantOption {
  id: string;
  label: string;
  action: AiAction;
  params?: Record<string, unknown>;
}

export type AssistantIntent =
  | 'greeting'
  | 'search'
  | 'product'
  | 'compare'
  | 'history'
  | 'map'
  | 'unknown';

export interface ToolMedicine {
  id: number;
  name: string;
  lab: string;
  description: string | null;
  categoria_id: number | null;
  categoria_nombre: string | null;
  precio_minimo: number | null;
  farmacias_count: number;
}

export interface ToolPriceItem {
  precioId: number;
  farmaciaId: number;
  farmaciaNombre: string;
  farmaciaDireccion: string;
  precio: number;
  fecha: string;
}

export interface ToolNearbyPharmacy {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  distance: number;
}

export interface PolicyResult {
  blocked: boolean;
  reason: string;
}
