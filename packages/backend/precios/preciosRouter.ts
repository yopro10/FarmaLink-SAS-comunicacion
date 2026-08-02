import { Router, Request, Response } from 'express';
import Database from '../shared/db.js';
import { PrecioStrategyFactory } from './PrecioStrategyFactory.js';
import { PrecioItem } from './strategies/PrecioStrategy.js';
import { validateUpdatePrecio } from './PrecioDTO.js';
import { PrecioHistorialService } from './PrecioHistorialService.js';
import { requireAuth } from '../shared/authMiddleware.js';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool = Database.getInstance().getPool();
    const result = await pool.query(`
      SELECT p.*, m.name as medicamento_nombre, m.lab as laboratorio, 
             m.description as medicamento_descripcion,
             f.name as farmacia_nombre, f.address as farmacia_direccion, f.phone as farmacia_telefono
      FROM precios p
      JOIN medicamentos m ON p.medicamento_id = m.id
      JOIN farmacias f ON p.farmacia_id = f.id
      ORDER BY p.fecha DESC
    `);
    res.json({ success: true, total: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener precios', error });
  }
});

router.get('/comparar/:medicamentoId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicamentoId: medId } = req.params;
    const orden = req.query.orden as string | undefined;

    const pool = Database.getInstance().getPool();

    const medResult = await pool.query('SELECT * FROM medicamentos WHERE id = $1', [medId]);
    if (medResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }
    const medicamento = medResult.rows[0];

    const preciosResult = await pool.query(`
      SELECT p.*, f.name as farmacia_nombre, f.address as farmacia_direccion
      FROM precios p
      JOIN farmacias f ON p.farmacia_id = f.id
      WHERE p.medicamento_id = $1
      ORDER BY p.fecha DESC
    `, [medId]);

    if (preciosResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No hay precios registrados para este medicamento',
      });
      return;
    }

    const precioItems: PrecioItem[] = preciosResult.rows.map((p: any) => ({
      precioId: p.id.toString(),
      farmaciaId: { _id: p.farmacia_id.toString(), name: p.farmacia_nombre, address: p.farmacia_direccion },
      farmaciaNombre: p.farmacia_nombre,
      precio: p.precio,
      fecha: p.fecha,
    }));

    const strategy = PrecioStrategyFactory.create(orden);
    const listaOrdenada = strategy.ordenar(precioItems);

    const mejorPrecioItem = PrecioStrategyFactory.create('asc').ordenar(precioItems)[0];

    res.json({
      success: true,
      estrategiaUsada: strategy.nombre,
      medicamento: {
        id: medicamento.id.toString(),
        name: medicamento.name,
        lab: medicamento.lab,
        description: medicamento.description,
      },
      mejorPrecio: {
        precio: mejorPrecioItem.precio,
        farmaciaNombre: mejorPrecioItem.farmaciaNombre,
        fecha: mejorPrecioItem.fecha,
      },
      listaOrdenada: listaOrdenada.map((item) => ({
        ...item,
        estrategiaUsada: strategy.nombre,
      })),
    });
  } catch (error) {
    console.error('[Precios] Error en comparar:', error);
    res.status(500).json({ success: false, message: 'Error al comparar precios', error });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: paramId } = req.params;
    const idString = Array.isArray(paramId) ? paramId[0] : paramId;
    const id = parseInt(idString);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID inválido' });
      return;
    }

    const errors = validateUpdatePrecio(req.body);
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: 'Datos inválidos', errors });
      return;
    }

    const pool = Database.getInstance().getPool();

    const currentResult = await pool.query(
      'SELECT * FROM precios WHERE id = $1',
      [id]
    );
    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Precio no encontrado' });
      return;
    }
    const current = currentResult.rows[0];

    if (req.body.medicamento_id && Number(req.body.medicamento_id) !== Number(current.medicamento_id)) {
      res.status(400).json({ 
        success: false, 
        message: 'El medicamento_id no coincide con el precio especificado' 
      });
      return;
    }

    const quienCambio = req.body.quien_cambio || req.body.userEmail || req.headers['x-user-email'] as string || 'sistema';

    await PrecioHistorialService.registrarCambio({
      precio_id: id,
      medicamento_id: current.medicamento_id,
      farmacia_id: current.farmacia_id,
      precio_anterior: current.precio,
      precio_nuevo: req.body.precio,
      quien_cambio: quienCambio,
    });

    const result = await pool.query(
      `UPDATE precios SET precio = $1, fecha = NOW() WHERE id = $2 RETURNING *`,
      [req.body.precio, id]
    );

    const medResult = await pool.query(
      'SELECT name, lab FROM medicamentos WHERE id = $1',
      [current.medicamento_id]
    );
    const farResult = await pool.query(
      'SELECT name, address FROM farmacias WHERE id = $1',
      [current.farmacia_id]
    );

    res.json({
      success: true,
      message: 'Precio actualizado correctamente',
      data: {
        ...result.rows[0],
        medicamento: medResult.rows[0],
        farmacia: farResult.rows[0],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar precio', error });
  }
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: paramId } = req.params;
    const idString = Array.isArray(paramId) ? paramId[0] : paramId;
    const id = parseInt(idString);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID inválido' });
      return;
    }

    const pool = Database.getInstance().getPool();

    const currentResult = await pool.query('SELECT * FROM precios WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Precio no encontrado' });
      return;
    }
    const current = currentResult.rows[0];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.body.precio !== undefined) {
      updates.push(`precio = $${paramIndex++}`);
      values.push(req.body.precio);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      return;
    }

    const quienCambio = req.body.quien_cambio || req.body.userEmail || req.headers['x-user-email'] as string || 'sistema';

    if (req.body.precio !== undefined && req.body.precio !== current.precio) {
      await PrecioHistorialService.registrarCambio({
        precio_id: id,
        medicamento_id: current.medicamento_id,
        farmacia_id: current.farmacia_id,
        precio_anterior: current.precio,
        precio_nuevo: req.body.precio,
        quien_cambio: quienCambio,
      });
    }

    updates.push(`fecha = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE precios SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Precio actualizado correctamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar precio', error });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicamento_id, farmacia_id, precio, userEmail } = req.body;

    if (!medicamento_id || !farmacia_id || precio === undefined) {
      res.status(400).json({ success: false, message: 'medicamento_id, farmacia_id y precio son requeridos' });
      return;
    }

    const medIdNum = parseInt(String(medicamento_id), 10);
    const farIdNum = parseInt(String(farmacia_id), 10);
    const precioNum = Math.round(Number(precio));

    if (isNaN(medIdNum) || isNaN(farIdNum) || isNaN(precioNum) || precioNum <= 0) {
      res.status(400).json({ success: false, message: 'Los valores de medicamento_id, farmacia_id y precio deben ser números válidos' });
      return;
    }

    const pool = Database.getInstance().getPool();

    const medResult = await pool.query('SELECT id FROM medicamentos WHERE id = $1', [medIdNum]);
    if (medResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }

    const farResult = await pool.query('SELECT id FROM farmacias WHERE id = $1', [farIdNum]);
    if (farResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Farmacia no encontrada' });
      return;
    }

    const existingResult = await pool.query(
      'SELECT id, precio FROM precios WHERE medicamento_id = $1 AND farmacia_id = $2',
      [medIdNum, farIdNum]
    );

    const quienCambio = userEmail || req.headers['x-user-email'] as string || 'sistema';

    if (existingResult.rows.length > 0) {
      const current = existingResult.rows[0];

      try {
        await PrecioHistorialService.registrarCambio({
          precio_id: Number(current.id),
          medicamento_id: medIdNum,
          farmacia_id: farIdNum,
          precio_anterior: Math.round(Number(current.precio)),
          precio_nuevo: precioNum,
          quien_cambio: quienCambio,
        });
      } catch (histErr) {
        console.warn('[Precios] No se pudo registrar historial (no crítico):', histErr);
      }

      const result = await pool.query(
        'UPDATE precios SET precio = $1, fecha = NOW() WHERE id = $2 RETURNING *',
        [precioNum, current.id]
      );
      res.json({ success: true, message: 'Precio actualizado', data: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO precios (medicamento_id, farmacia_id, precio, fecha)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [medIdNum, farIdNum, precioNum]
      );
      res.status(201).json({ success: true, message: 'Precio creado', data: result.rows[0] });
    }
  } catch (error) {
    console.error('[Precios] Error al procesar precio:', error);
    res.status(500).json({ success: false, message: 'Error al procesar precio', error });
  }
});

// ── Historial de precios (para gráfica tipo Keepa) ───────────────────────────

router.get('/historial/:medicamentoId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { medicamentoId } = req.params;
    const pool = Database.getInstance().getPool();

    // Verificar que el medicamento existe
    const medResult = await pool.query('SELECT id, name, lab FROM medicamentos WHERE id = $1', [medicamentoId]);
    if (medResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
      return;
    }

    // Obtener todos los cambios históricos, ordenados por fecha
    const historialResult = await pool.query(
      `SELECT
         h.id,
         h.precio_id,
         h.farmacia_id,
         f.name  AS farmacia_nombre,
         f.address AS farmacia_direccion,
         h.precio_anterior,
         h.precio_nuevo,
         h.fecha_cambio
       FROM historial_precios h
       JOIN farmacias f ON f.id = h.farmacia_id
       WHERE h.medicamento_id = $1
       ORDER BY h.fecha_cambio ASC`,
      [medicamentoId]
    );

    // Obtener el precio actual de cada farmacia para agregarlo como último punto
    const preciosActualesResult = await pool.query(
      `SELECT
         p.id,
         p.farmacia_id,
         f.name    AS farmacia_nombre,
         f.address AS farmacia_direccion,
         p.precio,
         p.fecha
       FROM precios p
       JOIN farmacias f ON f.id = p.farmacia_id
       WHERE p.medicamento_id = $1`,
      [medicamentoId]
    );

    // Construir el mapa de series por farmacia
    // Estructura: { farmaciaId: { farmaciaId, farmaciaNombre, puntos: [{fecha, precio}] } }
    const seriesMap: Record<string, {
      farmaciaId: string;
      farmaciaNombre: string;
      farmaciaDireccion: string;
      puntos: { fecha: string; precio: number }[];
    }> = {};

    for (const row of historialResult.rows) {
      const key = row.farmacia_id.toString();
      if (!seriesMap[key]) {
        seriesMap[key] = {
          farmaciaId: key,
          farmaciaNombre: row.farmacia_nombre,
          farmaciaDireccion: row.farmacia_direccion,
          puntos: [],
        };
      }
      // El primer punto de cada cambio usa precio_anterior si es la primera entrada de esa farmacia
      if (seriesMap[key].puntos.length === 0) {
        const fechaAnte = new Date(new Date(row.fecha_cambio).getTime() - 1).toISOString();
        seriesMap[key].puntos.push({ fecha: fechaAnte, precio: row.precio_anterior });
      }
      seriesMap[key].puntos.push({ fecha: row.fecha_cambio, precio: row.precio_nuevo });
    }

    // Agregar el precio actual como último punto
    for (const actual of preciosActualesResult.rows) {
      const key = actual.farmacia_id.toString();
      if (!seriesMap[key]) {
        // Farmacia sin historial: solo aparece con el precio actual
        seriesMap[key] = {
          farmaciaId: key,
          farmaciaNombre: actual.farmacia_nombre,
          farmaciaDireccion: actual.farmacia_direccion,
          puntos: [{ fecha: actual.fecha, precio: actual.precio }],
        };
      } else {
        // Agregar precio actual al final de la serie si no es duplicado
        const ultimoPunto = seriesMap[key].puntos[seriesMap[key].puntos.length - 1];
        if (ultimoPunto.precio !== actual.precio) {
          seriesMap[key].puntos.push({ fecha: actual.fecha, precio: actual.precio });
        }
      }
    }

    const series = Object.values(seriesMap).filter(s => s.puntos.length > 0).map(s => {
      // Ordenar cronológicamente para evitar líneas hacia atrás si el precio actual tiene fecha antigua
      s.puntos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
      // Filtrar duplicados exactos en tiempo, quedándose con el último cambio registrado de ese segundo
      const unicos: { fecha: string; precio: number }[] = [];
      for (const p of s.puntos) {
        if (unicos.length === 0) {
          unicos.push(p);
        } else {
          const prev = unicos[unicos.length - 1];
          if (new Date(prev.fecha).getTime() === new Date(p.fecha).getTime()) {
             unicos[unicos.length - 1] = p; // Sobrescribir con el más reciente
          } else {
             unicos.push(p);
          }
        }
      }
      s.puntos = unicos;
      return s;
    });

    res.json({
      success: true,
      medicamento: {
        id: medResult.rows[0].id,
        name: medResult.rows[0].name,
        lab: medResult.rows[0].lab,
      },
      totalCambios: historialResult.rows.length,
      series,
    });
  } catch (error) {
    console.error('[Precios] Error en historial:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial de precios', error });
  }
});

export default router;
