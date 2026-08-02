import { PrecioStrategy } from './strategies/PrecioStrategy.js';
import { PrecioAscendenteStrategy } from './strategies/PrecioAscendenteStrategy.js';
import { PrecioDescendenteStrategy } from './strategies/PrecioDescendenteStrategy.js';
import { PrecioRecienteStrategy } from './strategies/PrecioRecienteStrategy.js';

type OrdenType = 'asc' | 'desc' | 'reciente';

/**
 * Factory Method para estrategias de ordenamiento de precios.
 *
 * Selección automática:
 *  - 'asc'      → PrecioAscendenteStrategy  (más barato primero) — DEFAULT
 *  - 'desc'     → PrecioDescendenteStrategy (más caro primero)
 *  - 'reciente' → PrecioRecienteStrategy    (más reciente primero)
 */
export class PrecioStrategyFactory {
  private static readonly strategies: Record<OrdenType, PrecioStrategy> = {
    asc: new PrecioAscendenteStrategy(),
    desc: new PrecioDescendenteStrategy(),
    reciente: new PrecioRecienteStrategy(),
  };

  /**
   * Crea la estrategia de ordenamiento según el parámetro recibido.
   * Si no se especifica o es inválido, usa ascendente por defecto.
   */
  static create(orden?: string): PrecioStrategy {
    if (orden && orden in PrecioStrategyFactory.strategies) {
      return PrecioStrategyFactory.strategies[orden as OrdenType];
    }
    // Default: precio ascendente (más barato primero)
    return PrecioStrategyFactory.strategies.asc;
  }
}
