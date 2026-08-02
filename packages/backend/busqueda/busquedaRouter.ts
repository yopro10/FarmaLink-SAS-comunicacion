import { Router, Request, Response } from 'express';
import Database from '../shared/db.js';

const router = Router();

/**
 * GET /api/busqueda
 *
 * DOS PASADAS con unaccent (elimina problema de tildes):
 *
 *  PASADA 1 — unaccent(m.name) ILIKE unaccent('%q%')
 *    "acetaminofen" → unaccent → encuentra "Acetaminofén" ✅
 *    Si devuelve resultados → usar esos, NO ir a pasada 2.
 *
 *  PASADA 2 — Fuzzy pg_trgm umbral 0.6 (solo si pasada 1 vacía)
 *    "acetaminofn" → ILIKE falla, fuzzy rescata
 *    "hola"        → ILIKE falla, fuzzy 0.6 tampoco → vacío ✅
 *    "pelota"      → ILIKE falla, fuzzy 0.6 tampoco → vacío ✅
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = Database.getInstance().getPool();

    // Activar extensiones necesarias (idempotente)
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm').catch(() => {});
    await pool.query('CREATE EXTENSION IF NOT EXISTS unaccent').catch(() => {});

    const q          = ((req.query.q         as string) || '').trim();
    const categoria  = ((req.query.categoria as string) || '').trim();
    const lab        = ((req.query.lab       as string) || '').trim();
    const orden      = ((req.query.orden     as string) || 'relevancia').toLowerCase();
    const disponible = req.query.disponible as string | undefined;
    const precioMin  = req.query.precioMin ? parseInt(req.query.precioMin as string) : null;
    const precioMax  = req.query.precioMax ? parseInt(req.query.precioMax as string) : null;
    const page       = Math.max(1, parseInt((req.query.page  as string) || '1'));
    const limit      = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '10')));
    const offset     = (page - 1) * limit;

    const precioSub = `(SELECT MIN(p2.precio) FROM precios p2 WHERE p2.medicamento_id = m.id)`;

    // ── Filtros extra reutilizables (categoría, lab, precios, disponibilidad) ──
    function buildExtraFilters(startPi: number) {
      const extraParams: any[] = [];
      let extraSql = '';
      let pi = startPi;

      if (categoria) {
        extraSql += ` AND unaccent(c.nombre) ILIKE unaccent($${pi})`;
        extraParams.push(`%${categoria}%`);
        pi++;
      }
      if (lab) {
        extraSql += ` AND unaccent(m.lab) ILIKE unaccent($${pi})`;
        extraParams.push(`%${lab}%`);
        pi++;
      }
      if (disponible === 'true') {
        extraSql += ` AND EXISTS (SELECT 1 FROM precios p3 WHERE p3.medicamento_id = m.id)`;
      } else if (disponible === 'false') {
        extraSql += ` AND NOT EXISTS (SELECT 1 FROM precios p3 WHERE p3.medicamento_id = m.id)`;
      }
      if (precioMin !== null && !isNaN(precioMin)) {
        extraSql += ` AND ${precioSub} >= $${pi}`;
        extraParams.push(precioMin);
        pi++;
      }
      if (precioMax !== null && !isNaN(precioMax)) {
        extraSql += ` AND ${precioSub} <= $${pi}`;
        extraParams.push(precioMax);
        pi++;
      }

      return { extraSql, extraParams, pi };
    }

    // ── SELECT base ────────────────────────────────────────────────────────
    function buildSelect(scoreExpr: string): string {
      return `
        SELECT
          m.id, m.name, m.lab, m.active, m.description, m.categoria_id,
          c.nombre                       AS categoria_nombre,
          ${scoreExpr}                   AS score,
          ${precioSub}                   AS precio_minimo,
          COUNT(DISTINCT pr.farmacia_id) AS farmacias_count
        FROM medicamentos m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        LEFT JOIN precios pr   ON pr.medicamento_id = m.id
        WHERE m.active = true
      `;
    }

    const groupBy  = ` GROUP BY m.id, m.name, m.lab, m.active, m.description, m.categoria_id, c.nombre`;

    function buildOrder(hasQ: boolean): string {
      switch (orden) {
        case 'precio_asc':  return ` ORDER BY precio_minimo ASC NULLS LAST`;
        case 'precio_desc': return ` ORDER BY precio_minimo DESC NULLS LAST`;
        case 'nombre':      return ` ORDER BY m.name ASC`;
        default:            return hasQ ? ` ORDER BY score DESC, m.name ASC` : ` ORDER BY m.name ASC`;
      }
    }

    let finalRows:  any[] = [];
    let finalTotal = 0;
    let metodo     = 'sin_query';

    if (q) {
      // ════════════════════════════════════════════════════════════════════
      // PASADA 1 — unaccent ILIKE (exacto, ignora tildes y mayúsculas)
      // ════════════════════════════════════════════════════════════════════
      const p1Params: any[] = [`%${q}%`]; // $1
      let p1Pi = 2;

      const { extraSql: e1, extraParams: ep1, pi: p1Pi2 } = buildExtraFilters(p1Pi);
      p1Pi = p1Pi2;

      const p1Base = buildSelect('1.0') +
        ` AND (unaccent(m.name) ILIKE unaccent($1) OR unaccent(m.lab) ILIKE unaccent($1))` +
        e1 + groupBy + buildOrder(true);

      const allP1 = [...p1Params, ...ep1];

      const c1 = await pool.query(`SELECT COUNT(*) FROM (${p1Base}) AS sub`, allP1);
      const totalP1 = parseInt(c1.rows[0].count);

      if (totalP1 > 0) {
        // Pasada 1 exitosa — usar solo estos resultados
        metodo = 'ilike_exacto';
        finalTotal = totalP1;
        const p1Pag = p1Base + ` LIMIT $${p1Pi} OFFSET $${p1Pi + 1}`;
        const r1 = await pool.query(p1Pag, [...allP1, limit, offset]);
        finalRows = r1.rows;
      } else {
        // ══════════════════════════════════════════════════════════════════
        // PASADA 2 — Fuzzy pg_trgm umbral 0.6 (solo si pasada 1 = vacío)
        // ══════════════════════════════════════════════════════════════════
        metodo = 'fuzzy_fallback';
        const p2Params: any[] = [q]; // $1 para word_similarity
        let p2Pi = 2;

        const scoreExpr = `GREATEST(word_similarity($1, m.name), word_similarity($1, m.lab))`;
        const { extraSql: e2, extraParams: ep2, pi: p2Pi2 } = buildExtraFilters(p2Pi);
        p2Pi = p2Pi2;

        const p2Base = buildSelect(scoreExpr) +
          ` AND (
              word_similarity($1, m.name) > 0.6
              OR word_similarity($1, m.lab)  > 0.6
           )` +
          e2 + groupBy + buildOrder(true);

        const allP2 = [...p2Params, ...ep2];

        const c2 = await pool.query(`SELECT COUNT(*) FROM (${p2Base}) AS sub`, allP2);
        finalTotal = parseInt(c2.rows[0].count);

        if (finalTotal > 0) {
          const p2Pag = p2Base + ` LIMIT $${p2Pi} OFFSET $${p2Pi + 1}`;
          const r2 = await pool.query(p2Pag, [...allP2, limit, offset]);
          finalRows = r2.rows;
        }
      }

    } else {
      // ── Sin query → todos con filtros extra ───────────────────────────
      metodo = 'sin_query';
      const { extraSql, extraParams, pi } = buildExtraFilters(1);

      const sqlNoQ = buildSelect('1.0') + extraSql + groupBy + buildOrder(false);
      const cNoQ   = await pool.query(`SELECT COUNT(*) FROM (${sqlNoQ}) AS sub`, extraParams);
      finalTotal   = parseInt(cNoQ.rows[0].count);

      const sqlPag = sqlNoQ + ` LIMIT $${pi} OFFSET $${pi + 1}`;
      const rNoQ   = await pool.query(sqlPag, [...extraParams, limit, offset]);
      finalRows    = rNoQ.rows;
    }

    res.json({
      success: true,
      query:   q || null,
      metodo,
      filtros: {
        categoria:  categoria  || null,
        lab:        lab        || null,
        precioMin:  precioMin  ?? null,
        precioMax:  precioMax  ?? null,
        disponible: disponible ?? null,
        orden,
      },
      paginacion: {
        page,
        limit,
        total: finalTotal,
        totalPaginas: Math.ceil(finalTotal / limit),
      },
      data: finalRows.map((row: any) => ({
        id:               row.id,
        name:             row.name,
        lab:              row.lab,
        description:      row.description,
        categoria_id:     row.categoria_id,
        categoria_nombre: row.categoria_nombre || null,
        precio_minimo:    row.precio_minimo ? parseInt(row.precio_minimo) : null,
        farmacias_count:  parseInt(row.farmacias_count),
        score:            row.score ? parseFloat(parseFloat(row.score).toFixed(3)) : null,
      })),
    });

  } catch (error: any) {
    console.error('[Búsqueda] Error:', error);
    res.status(500).json({ success: false, message: 'Error en la búsqueda', error: error.message });
  }
});

/**
 * GET /api/busqueda/filtros
 */
router.get('/filtros', async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool = Database.getInstance().getPool();

    const [categorias, laboratorios, precioRango] = await Promise.all([
      pool.query(`
        SELECT c.id, c.nombre, c.orden, COUNT(m.id) AS total_medicamentos
        FROM categorias c
        LEFT JOIN medicamentos m ON m.categoria_id = c.id AND m.active = true
        GROUP BY c.id, c.nombre, c.orden
        ORDER BY c.orden ASC, c.nombre ASC
      `),
      pool.query(`
        SELECT DISTINCT lab, COUNT(*) AS total
        FROM medicamentos WHERE active = true
        GROUP BY lab ORDER BY lab ASC
      `),
      pool.query(`
        SELECT MIN(precio) AS precio_min, MAX(precio) AS precio_max,
               ROUND(AVG(precio)) AS precio_promedio
        FROM precios
      `),
    ]);

    res.json({
      success: true,
      filtros: {
        categorias:   categorias.rows,
        laboratorios: laboratorios.rows,
        precioRango: {
          min:      parseInt(precioRango.rows[0]?.precio_min)      || 0,
          max:      parseInt(precioRango.rows[0]?.precio_max)      || 0,
          promedio: parseInt(precioRango.rows[0]?.precio_promedio) || 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error al obtener filtros', error: error.message });
  }
});

export default router;
