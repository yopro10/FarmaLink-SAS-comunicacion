import { PrecioStrategy, PrecioItem } from './PrecioStrategy.js';

/**
 * Estrategia: Precio Descendente
 * Ordena de mayor a menor precio.
 * Útil para ver las opciones premium primero.
 */
export class PrecioDescendenteStrategy implements PrecioStrategy {
  nombre = 'precio_descendente';

  ordenar(precios: PrecioItem[]): PrecioItem[] {
    return [...precios].sort((a, b) => b.precio - a.precio);
  }
}
