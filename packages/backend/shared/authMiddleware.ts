import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Database from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto';
console.log('[Auth] JWT_SECRET loaded:', JWT_SECRET ? 'YES (length: ' + JWT_SECRET.length + ')' : 'NO');

function emailFromBearerToken(token: string): string {
  const parts = token.split('.');
  if (parts.length === 3) {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { email?: string };
    if (!decoded.email || typeof decoded.email !== 'string') throw new Error('invalid');
    return decoded.email;
  }
  const email = Buffer.from(token, 'base64').toString('utf8');
  if (!email || !email.includes('@')) throw new Error('invalid');
  return email;
}

/**
 * Bearer puede ser JWT (gateway / login nuevo) o base64(email) legado.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.slice(7);
  let email: string;
  try {
    email = emailFromBearerToken(token);
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' });
    return;
  }

  try {
    const pool = Database.getInstance().getPool();
    const result = await pool.query(
      'SELECT id, name, email, role FROM public.usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    (req as any).usuarioActual = result.rows[0];
    next();
  } catch (error) {
    console.error('[Auth] Error verificando token:', error);
    res.status(500).json({ success: false, message: 'Error interno al verificar autenticación' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const usuario = (req as any).usuarioActual;
    if (usuario?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Se requiere rol de administrador' });
      return;
    }
    next();
  });
}
