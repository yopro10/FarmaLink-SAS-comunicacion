import Database from '../shared/db.js';
import type {
  AssistantSuggestion,
  ToolMedicine,
  ToolNearbyPharmacy,
  ToolPriceItem,
} from './types.js';

export function toAssistantSuggestion(med: ToolMedicine): AssistantSuggestion {
  return {
    _id: med.id.toString(),
    id: med.id,
    name: med.name,
    lab: med.lab,
    category: med.categoria_nombre || undefined,
    categoria_nombre: med.categoria_nombre || undefined,
    description: med.description || undefined,
    estrategiaUsada: 'asistente_ia',
  };
}

export async function searchMedicines(query: string, limit = 8): Promise<ToolMedicine[]> {
  const pool = Database.getInstance().getPool();
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const q = `%${query.trim()}%`;

  const result = await pool.query(
    `SELECT
        m.id,
        m.name,
        m.lab,
        m.description,
        m.categoria_id,
        c.nombre AS categoria_nombre,
        (SELECT MIN(p2.precio) FROM precios p2 WHERE p2.medicamento_id = m.id) AS precio_minimo,
        COUNT(DISTINCT p.farmacia_id)::int AS farmacias_count
      FROM medicamentos m
      LEFT JOIN categorias c ON c.id = m.categoria_id
      LEFT JOIN precios p ON p.medicamento_id = m.id
      WHERE m.active = true
        AND (
          unaccent(m.name) ILIKE unaccent($1)
          OR unaccent(m.lab) ILIKE unaccent($1)
          OR unaccent(c.nombre) ILIKE unaccent($1)
        )
      GROUP BY m.id, m.name, m.lab, m.description, m.categoria_id, c.nombre
      ORDER BY
        CASE WHEN unaccent(m.name) ILIKE unaccent($2) THEN 0 ELSE 1 END,
        m.name ASC
      LIMIT $3`,
    [q, q, safeLimit]
  );

  return result.rows.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    lab: String(row.lab),
    description: row.description ? String(row.description) : null,
    categoria_id: row.categoria_id ? Number(row.categoria_id) : null,
    categoria_nombre: row.categoria_nombre ? String(row.categoria_nombre) : null,
    precio_minimo: row.precio_minimo !== null ? Number(row.precio_minimo) : null,
    farmacias_count: Number(row.farmacias_count || 0),
  }));
}

export async function getMedicineById(id: number): Promise<ToolMedicine | null> {
  const pool = Database.getInstance().getPool();

  const result = await pool.query(
    `SELECT
        m.id,
        m.name,
        m.lab,
        m.description,
        m.categoria_id,
        c.nombre AS categoria_nombre,
        (SELECT MIN(p2.precio) FROM precios p2 WHERE p2.medicamento_id = m.id) AS precio_minimo,
        COUNT(DISTINCT p.farmacia_id)::int AS farmacias_count
      FROM medicamentos m
      LEFT JOIN categorias c ON c.id = m.categoria_id
      LEFT JOIN precios p ON p.medicamento_id = m.id
      WHERE m.id = $1
      GROUP BY m.id, m.name, m.lab, m.description, m.categoria_id, c.nombre`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: String(row.name),
    lab: String(row.lab),
    description: row.description ? String(row.description) : null,
    categoria_id: row.categoria_id ? Number(row.categoria_id) : null,
    categoria_nombre: row.categoria_nombre ? String(row.categoria_nombre) : null,
    precio_minimo: row.precio_minimo !== null ? Number(row.precio_minimo) : null,
    farmacias_count: Number(row.farmacias_count || 0),
  };
}

export async function comparePrices(medicamentoId: number): Promise<ToolPriceItem[]> {
  const pool = Database.getInstance().getPool();

  const result = await pool.query(
    `SELECT
        p.id AS precio_id,
        p.farmacia_id,
        f.name AS farmacia_nombre,
        f.address AS farmacia_direccion,
        p.precio,
        p.fecha
      FROM precios p
      JOIN farmacias f ON f.id = p.farmacia_id
      WHERE p.medicamento_id = $1
      ORDER BY p.precio ASC, p.fecha DESC`,
    [medicamentoId]
  );

  return result.rows.map((row: any) => ({
    precioId: Number(row.precio_id),
    farmaciaId: Number(row.farmacia_id),
    farmaciaNombre: String(row.farmacia_nombre),
    farmaciaDireccion: row.farmacia_direccion ? String(row.farmacia_direccion) : '',
    precio: Number(row.precio),
    fecha: new Date(row.fecha).toISOString(),
  }));
}

export async function getPriceHistory(medicamentoId: number): Promise<Array<{ fecha: string; precio: number; farmacia: string }>> {
  const pool = Database.getInstance().getPool();

  const result = await pool.query(
    `SELECT
        h.fecha_cambio,
        h.precio_nuevo,
        f.name AS farmacia_nombre
      FROM historial_precios h
      JOIN farmacias f ON f.id = h.farmacia_id
      WHERE h.medicamento_id = $1
      ORDER BY h.fecha_cambio ASC`,
    [medicamentoId]
  );

  return result.rows.map((row: any) => ({
    fecha: new Date(row.fecha_cambio).toISOString(),
    precio: Number(row.precio_nuevo),
    farmacia: String(row.farmacia_nombre),
  }));
}

export async function getNearbyPharmacies(lat: number, lng: number, limit = 8): Promise<ToolNearbyPharmacy[]> {
  const pool = Database.getInstance().getPool();
  const safeLimit = Math.max(1, Math.min(limit, 20));

  const result = await pool.query(
    `SELECT
        id,
        name,
        address,
        phone,
        latitude,
        longitude,
        (
          6371 * acos(
            cos(radians($1))
            * cos(radians(latitude))
            * cos(radians(longitude) - radians($2))
            + sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM farmacias
      ORDER BY distance ASC
      LIMIT $3`,
    [lat, lng, safeLimit]
  );

  return result.rows.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    address: row.address ? String(row.address) : null,
    phone: row.phone ? String(row.phone) : null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distance: Number(row.distance),
  }));
}
