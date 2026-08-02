import { Router, Request, Response } from 'express';
import Database from '../shared/db.js';

const router = Router();

/**
 * GET /api/categorias
 * Retorna todas las categorías de medicamentos ordenadas
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool = Database.getInstance().getPool();
    const result = await pool.query(
      'SELECT id, nombre, orden FROM categorias ORDER BY orden ASC, nombre ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching categorias:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

export default router;
