import { Request, Response } from 'express';
import Database from '../shared/db.js';
import {
  validateCreateMedicamento,
  validateUpdateMedicamento,
  CreateMedicamentoDTO,
  UpdateMedicamentoDTO,
} from './MedicamentoDTO.js';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { category, active, lab } = req.query;
    const pool = Database.getInstance().getPool();

    let query = `
      SELECT DISTINCT ON (m.id) 
             m.*, c.nombre as categoria_nombre, c.orden as categoria_orden,
             f.id as "farmaciaId", f.name as "farmaciaNombre",
             p.precio as precio
      FROM medicamentos m
      LEFT JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN precios p ON m.id = p.medicamento_id
      LEFT JOIN farmacias f ON p.farmacia_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND c.nombre ILIKE $${paramIndex}`;
      params.push(`%${category}%`);
      paramIndex++;
    }
    if (active !== undefined) {
      query += ` AND m.active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }
    if (lab) {
      query += ` AND m.lab ILIKE $${paramIndex}`;
      params.push(`%${lab}%`);
      paramIndex++;
    }

    // DISTINCT ON (m.id) toma la primera fila según ORDER BY: usamos la última fecha de precio.
    query += ' ORDER BY m.id, p.fecha DESC NULLS LAST';

    const result = await pool.query(query, params);

    res.json({ success: true, total: result.rows.length, data: result.rows });
  } catch (error) {
    console.error(' Error en GET /api/medicamentos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener medicamentos', error });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pool = Database.getInstance().getPool();

    const result = await pool.query(
      `SELECT DISTINCT ON (m.id)
              m.*, c.nombre as categoria_nombre, c.orden as categoria_orden,
              f.id as "farmaciaId", f.name as "farmaciaNombre",
              p.precio as precio
       FROM medicamentos m
       LEFT JOIN categorias c ON m.categoria_id = c.id
       LEFT JOIN precios p ON m.id = p.medicamento_id
       LEFT JOIN farmacias f ON p.farmacia_id = f.id
       WHERE m.id = $1
       ORDER BY m.id, p.fecha DESC NULLS LAST`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener medicamento', error });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body: CreateMedicamentoDTO = req.body;

    const errors = validateCreateMedicamento(body);
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: 'Datos inválidos', errors });
      return;
    }

    const pool = Database.getInstance().getPool();
    
    const result = await pool.query(
      `INSERT INTO medicamentos (name, lab, active, description, categoria_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        body.name.trim(),
        body.lab.trim(),
        body.active ?? true,
        body.description?.trim() || null,
        body.categoria_id || null,
      ]
    );

    res.status(201).json({ success: true, message: 'Medicamento creado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear medicamento', error });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const body: UpdateMedicamentoDTO = req.body;

    const errors = validateUpdateMedicamento(body);
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: 'Datos inválidos', errors });
      return;
    }

    const pool = Database.getInstance().getPool();

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(body.name.trim());
    }
    if (body.lab !== undefined) {
      updates.push(`lab = $${paramIndex++}`);
      params.push(body.lab.trim());
    }
    if (body.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(body.active);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(body.description.trim());
    }
    if (body.categoria_id !== undefined) {
      updates.push(`categoria_id = $${paramIndex++}`);
      params.push(body.categoria_id);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      return;
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE medicamentos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Medicamento actualizado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar medicamento', error });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pool = Database.getInstance().getPool();

    const result = await pool.query('DELETE FROM medicamentos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Medicamento eliminado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar medicamento', error });
  }
}
