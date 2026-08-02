/**
 * Strategy Pattern para comparación de precios.
 * Define el contrato que deben cumplir todas las estrategias de ordenamiento.
 */

export interface PrecioItem {
  farmaciaId: string | object;
  farmaciaNombre: string;
  precio: number;
  fecha: Date;
  precioId: string;
}

export interface PrecioStrategy {
  nombre: string;
  ordenar(precios: PrecioItem[]): PrecioItem[];
}
