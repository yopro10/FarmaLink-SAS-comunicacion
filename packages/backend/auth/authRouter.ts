import express from 'express';
import jwt from 'jsonwebtoken';
import Database from '../shared/db.js';
import { verifyPassword } from '../shared/password.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto';
console.log('[AuthRouter] JWT_SECRET loaded:', JWT_SECRET ? 'YES (length: ' + JWT_SECRET.length + ')' : 'NO');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email requerido' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Contraseña requerida' });
  }

  try {
    const pool = Database.getInstance().getPool();
    console.log('[Auth] Querying usuario:', email.trim().toLowerCase());
    const result = await pool.query(
      'SELECT id, name, email, role, password FROM usuarios WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    console.log('[Auth] Rows found:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const row = result.rows[0];
    const ok = await verifyPassword(password, row.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    try {
      await pool.query(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
        [row.id]
      );
    } catch {
      // columna ultimo_login opcional hasta migración
    }

    const token = jwt.sign(
      { email: row.email, role: row.role, id: row.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[Auth] Login exitoso: ${row.email} (rol: ${row.role})`);

    res.json({
      success: true,
      token,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
      },
    });
  } catch (error) {
    console.error('[Auth] Error en login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Error interno del servidor', debug: errorMessage });
  }
});

export default router;
