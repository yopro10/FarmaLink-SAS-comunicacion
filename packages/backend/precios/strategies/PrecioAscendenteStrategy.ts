import { PrecioStrategy, PrecioItem } from './PrecioStrategy.js';

/**
 * Estrategia: Precio Ascendente
 * Ordena de menor a mayor precio — muestra primero la opción más económica.
 * Es la estrategia por defecto para comparación de precios.
 */
export class PrecioAscendenteStrategy implements PrecioStrategy {
  nombre = 'precio_ascendente';

  ordenar(precios: PrecioItem[]): PrecioItem[] {
    return [...precios].sort((a, b) => a.precio - b.precio);
  }
}
