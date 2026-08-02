import { Router, Request, Response } from 'express';
import Database from '../shared/db.js';

const router = Router();

// GET /api/farmacias/cercanas?lat=...&lng=...
router.get('/cercanas', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: 'Se requieren query params lat y lng validos.' });
      return;
    }

    const pool = Database.getInstance().getPool();
    
    // Formula de Haversine en SQL para calcular distancias en kilometros
    const query = `
      SELECT id, name, address, phone, latitude, longitude,
        ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) ) 
        * cos( radians( longitude ) - radians($2) ) + sin( radians($1) ) 
        * sin( radians( latitude ) ) ) ) AS distance 
      FROM farmacias 
      ORDER BY distance ASC 
      LIMIT 10;
    `;
    
    const result = await pool.query(query, [lat, lng]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching farmacias cercanas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/farmacias
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pool = Database.getInstance().getPool();
    const result = await pool.query('SELECT * FROM farmacias ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching farmacias' });
  }
});

export default router;
