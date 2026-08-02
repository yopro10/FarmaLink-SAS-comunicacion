import { SugerenciaStrategy } from './strategies/SugerenciaStrategy.js';
import { CoincidenciaParcialStrategy } from './strategies/CoincidenciaParcialStrategy.js';
import { PorCategoriaStrategy } from './strategies/PorCategoriaStrategy.js';
import { SimilitudBasicaStrategy } from './strategies/SimilitudBasicaStrategy.js';
import { FuzzySearchStrategy } from './strategies/FuzzySearchStrategy.js';

type StrategyType = 'parcial' | 'categoria' | 'similitud' | 'fuzzy';

/**
 * Factory Method para estrategias de sugerencias.
 *
 * Lógica de selección automática según el query:
 *  1. Si el query contiene términos de categorías → PorCategoriaStrategy
 *  2. Si el query tiene 4+ caracteres             → FuzzySearchStrategy (pg_trgm)
 *  3. Si el query tiene 3 caracteres              → CoincidenciaParcialStrategy
 *  4. Fallback                                    → SimilitudBasicaStrategy
 *
 * También permite selección manual mediante el parámetro `tipo`.
 */
export class SugerenciaFactory {
  private static readonly strategies: Record<StrategyType, SugerenciaStrategy> = {
    parcial:   new CoincidenciaParcialStrategy(),
    categoria: new PorCategoriaStrategy(),
    similitud: new SimilitudBasicaStrategy(),
    fuzzy:     new FuzzySearchStrategy(),
  };

  private static readonly categoryKeywords = [
    'analg', 'antibio', 'antiinf', 'antial', 'gastro',
    'antidiab', 'cardio', 'respir', 'cortico', 'psico', 'suplem',
  ];

  static create(query: string, tipo?: string): SugerenciaStrategy {
    if (tipo && tipo in SugerenciaFactory.strategies) {
      return SugerenciaFactory.strategies[tipo as StrategyType];
    }

    const q = query.toLowerCase().trim();

    // ¿Parece una búsqueda por categoría?
    const esCategoria = SugerenciaFactory.categoryKeywords.some((kw) => q.includes(kw));
    if (esCategoria) {
      return SugerenciaFactory.strategies.categoria;
    }

    // 4+ caracteres → fuzzy (tolera errores ortográficos)
    if (q.length >= 4) {
      return SugerenciaFactory.strategies.fuzzy;
    }

    // 3 caracteres → coincidencia parcial exacta
    if (q.length === 3) {
      return SugerenciaFactory.strategies.parcial;
    }

    // Fallback general
    return SugerenciaFactory.strategies.similitud;
  }

  static createAll(): SugerenciaStrategy[] {
    return Object.values(SugerenciaFactory.strategies);
  }
}
