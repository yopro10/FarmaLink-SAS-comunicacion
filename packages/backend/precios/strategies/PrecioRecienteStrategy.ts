import { PrecioStrategy, PrecioItem } from './PrecioStrategy.js';

/**
 * Estrategia: Precio Reciente
 * Ordena por la fecha de actualización más reciente primero.
 * Útil para ver qué farmacias tienen precios actualizados recientemente.
 */
export class PrecioRecienteStrategy implements PrecioStrategy {
  nombre = 'precio_reciente';

  ordenar(precios: PrecioItem[]): PrecioItem[] {
    return [...precios].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }
}
