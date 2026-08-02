/**
 * Tipos del dominio FarmaLink
 * @package Farmalink
 * @description Definiciones de tipos interfaces para el frontend de FarmaLink
 */

/**
 * Categoría de medicamentos (tabla categorias en PostgreSQL)
 */
export interface Categoria {
  id: number;
  nombre: string;
  orden: number;
}

/**
 * Representa una farmacia registrada en el sistema
 * @interface Farmacia
 */
export interface Farmacia {
  /** Identificador único de la farmacia (PostgreSQL usa número) */
  id?: number;
  _id: string;
  /** Nombre comercial de la farmacia */
  name: string;
  /** Dirección física de la farmacia */
  address?: string;
  /** Teléfono de contacto */
  phone?: string;
  /** Latitud para coordenadas geográficas */
  lat?: number;
  latitude?: number;
  /** Longitud para coordenadas geográficas */
  lng?: number;
  longitude?: number;
}

/**
 * Representa un medicamento en el sistema
 * @interface Medicamento
 */
export interface Medicamento {
  /** Identificador único del medicamento */
  id: number;
  /** Nombre comercial del medicamento */
  name: string;
  /** Laboratorio fabricante */
  lab: string;
  /** Indica si el medicamento está activo/disponible */
  active: boolean;
  /** Descripción detallada del medicamento */
  description?: string;
  /** Categoría terapéutica (campo legacy) */
  category?: string;
  /** FK a la categoría (PostgreSQL) */
  categoria_id?: number;
  /** Nombre de la categoría (via JOIN) */
  categoria_nombre?: string;
  /** FK a la farmacia que ofrece este medicamento */
  farmaciaId?: Farmacia | string;
}

/**
 * Representa el precio de un medicamento en una farmacia específica
 * @interface Precio
 */
export interface Precio {
  /** Identificador único del precio */
  id?: number;
  _id: string;
  /** Valor monetario del medicamento */
  precio: number;
  /** FK al medicamento */
  medicamentoId?: Medicamento;
  /** FK a la farmacia */
  farmaciaId?: Farmacia;
  /** Fecha de vigencia del precio */
  fecha: string;
}

/**
 * Datos agregados del dashboard
 * @interface DashboardData
 */
export interface DashboardData {
  /** Lista de farmacias disponibles */
  farmacias: Farmacia[];
  /** Lista de medicamentos disponibles */
  medicamentos: Medicamento[];
  /** Lista de precios registrados */
  precios: Precio[];
}

/**
 * Sugerencia de búsqueda retornada por el API
 * @interface Sugerencia
 */
export interface Sugerencia {
  /** Identificador único */
  _id: string;
  id?: number;
  /** Nombre del medicamento */
  name: string;
  /** Laboratorio */
  lab: string;
  /** Categoría terapéutica */
  category?: string;
  categoria_nombre?: string;
  /** Descripción del medicamento */
  description?: string;
  /** Estrategia utilizada para la sugerencia */
  estrategiaUsada: string;
}

/**
 * Tipos para el carrito de compras
 */
export interface CartItem {
  id: string; // Unique ID for the cart item (usually medId + farmaciaId)
  medicamento: Sugerencia;
  farmaciaId: string;
  farmaciaNombre: string;
  precioUnidad: number;
  cantidad: number;
}

/**
 * Perfil público de un desarrollador del equipo
 */
export interface PerfilDesarrollador {
  id: number;
  name: string;
  role: string;
  phone?: string | null;
  profile_picture?: string | null;
  bio?: string | null;
  created_at: string;
}

/**
 * Vistas disponibles en la aplicación
 */
export type View = 'home' | 'buscar' | 'dashboard' | 'admin' | 'login' | 'registro' | 'producto' | 'mapa' | 'categoria' | 'settings' | 'quienes-somos' | 'cart' | 'checkout' | 'desarrolladores' | 'validador' | 'faq';


/**
 * Pestañas del dashboard
 */
export type Tab = 'farmacias' | 'medicamentos' | 'precios';

/**
 * Resultado de búsqueda con precios por farmacia
 * @interface SearchResult
 */
export interface SearchResult {
  /** Medicamento encontrado */
  medicamento: Medicamento;
  /** Lista de precios por farmacia */
  precios: Array<{
    farmacia: Farmacia;
    precio: number;
    fecha: string;
  }>;
  /** Precio más bajo encontrado */
  mejorPrecio?: number;
}


/**
 * Resultado de búsqueda con precios por farmacia
 * @interface SearchResult
 */
export interface SearchResult {
  /** Medicamento encontrado */
  medicamento: Medicamento;
  /** Lista de precios por farmacia */
  precios: Array<{
    farmacia: Farmacia;
    precio: number;
    fecha: string;
  }>;
  /** Precio más bajo encontrado */
  mejorPrecio?: number;
}
