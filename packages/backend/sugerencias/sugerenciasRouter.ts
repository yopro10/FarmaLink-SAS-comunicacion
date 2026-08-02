import { Router, Request, Response } from 'express';
import Database from '../shared/db.js';
import { SugerenciaFactory } from './SugerenciaFactory.js';
import { SugerenciaResult } from './strategies/SugerenciaStrategy.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();
    const estrategiaTipo = req.query.estrategia as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

    if (q.length < 2) {
      res.status(400).json({
        success: false,
        message: 'El parámetro "q" debe tener al menos 2 caracteres',
        sugerencias: [],
      });
      return;
    }

    const pool = Database.getInstance().getPool();
    const result = await pool.query(`
      SELECT m.*, c.nombre as categoria_nombre
      FROM medicamentos m
      LEFT JOIN categorias c ON m.categoria_id = c.id
      WHERE m.active = true
    `);

    const medicamentos = result.rows.map((m: any) => ({
      _id: m.id.toString(),
      id: m.id,
      name: m.name,
      lab: m.lab,
      active: m.active,
      description: m.description,
      category: m.categoria_nombre || '',
      categoria_nombre: m.categoria_nombre || '',
      categoria_id: m.categoria_id,
    }));

    const estrategia = SugerenciaFactory.create(q, estrategiaTipo);
    let resultados: SugerenciaResult[] = await estrategia.buscar(q, medicamentos as any);

    // Fallback: si la estrategia principal no da resultados, usar similitud básica
    if (resultados.length === 0 && estrategia.nombre !== 'similitud_basica') {
      const fallback = SugerenciaFactory.create(q, 'similitud');
      resultados = await fallback.buscar(q, medicamentos as any);
    }

    const vistos = new Set<string>();
    const unicos = resultados.filter((r) => {
      if (vistos.has(r._id)) return false;
      vistos.add(r._id);
      return true;
    }).slice(0, limit);

    res.json({
      success: true,
      query: q,
      estrategiaUsada: unicos[0]?.estrategiaUsada ?? estrategia.nombre,
      total: unicos.length,
      sugerencias: unicos,
    });
  } catch (error) {
    console.error('[Sugerencias] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al buscar sugerencias',
      sugerencias: [],
    });
  }
});

export default router;
