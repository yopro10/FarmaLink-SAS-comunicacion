import { IMedicamento } from '../../models/Medicamento.js';
import { SugerenciaStrategy, SugerenciaResult } from './SugerenciaStrategy.js';
import Database from '../../shared/db.js';

/**
 * Estrategia 4: Fuzzy Search con pg_trgm
 *
 * Usa la extensión pg_trgm de PostgreSQL para búsqueda tolerante a
 * errores ortográficos mediante similitud de trigramas.
 *
 * Ejemplos de corrección automática:
 *   "aspirnia"     → "Aspirina"
 *   "acetaminofen" → "Acetaminofén"
 *   "ibuprofem"    → "Ibuprofeno"
 *   "amoxicilna"   → "Amoxicilina"
 */
export class FuzzySearchStrategy implements SugerenciaStrategy {
  nombre = 'fuzzy_trgm';

  async buscar(query: string, medicamentos: IMedicamento[]): Promise<SugerenciaResult[]> {
    const q = query.trim();
    const pool = Database.getInstance().getPool();

    try {
      // Activar pg_trgm (idempotente, no falla si ya existe)
      await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

      // word_similarity es más flexible que similarity() para palabras parciales
      const result = await pool.query(
        `SELECT
           m.id,
           m.name,
           m.lab,
           m.active,
           m.description,
           m.categoria_id,
           c.nombre AS categoria_nombre,
           GREATEST(
             word_similarity($1, m.name),
             word_similarity($1, m.lab)
           ) AS score
         FROM medicamentos m
         LEFT JOIN categorias c ON m.categoria_id = c.id
         WHERE m.active = true
           AND (
             word_similarity($1, m.name) > 0.35
             OR word_similarity($1, m.lab) > 0.35
             OR (LENGTH($1) >= 4 AND m.name ILIKE $2)
           )
         ORDER BY score DESC
         LIMIT 15`,
        [q, `%${q}%`]
      );

      return result.rows.map((row: any) => ({
        _id:             row.id.toString(),
        name:            row.name,
        lab:             row.lab,
        categoria_id:    row.categoria_id,
        categoria_nombre: row.categoria_nombre || '',
        category:        row.categoria_nombre || '',
        description:     row.description,
        estrategiaUsada: this.nombre,
        score:           parseFloat(parseFloat(row.score).toFixed(3)),
      }));

    } catch (error: any) {
      // Fallback en JS cuando pg_trgm no está disponible en el servidor
      console.warn('[FuzzySearch] pg_trgm no disponible, usando fallback JS:', error.message);
      return this._fallbackJS(q, medicamentos);
    }
  }

  /**
   * Fallback: Levenshtein normalizado en JavaScript.
   * Se activa solo si pg_trgm no está disponible en la BD.
   */
  private _fallbackJS(query: string, medicamentos: IMedicamento[]): SugerenciaResult[] {
    const q = query.toLowerCase();

    return medicamentos
      .filter((m) => m.active)
      .map((m) => {
        const nameScore = this._levenshteinScore(q, m.name.toLowerCase());
        const labScore  = this._levenshteinScore(q, m.lab.toLowerCase());
        return { m, score: Math.max(nameScore, labScore) };
      })
      .filter(({ score }) => score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(({ m }) => ({
        _id:             m._id.toString(),
        name:            m.name,
        lab:             m.lab,
        categoria_id:    m.categoria_id,
        categoria_nombre: '',
        category:        '',
        description:     m.description,
        estrategiaUsada: 'fuzzy_js',
      }));
  }

  private _levenshteinScore(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
      Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
    const dist = matrix[b.length][a.length];
    return 1 - dist / Math.max(a.length, b.length, 1);
  }
}
