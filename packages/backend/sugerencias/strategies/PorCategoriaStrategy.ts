import { IMedicamento } from '../../models/Medicamento.js';
import { SugerenciaStrategy, SugerenciaResult } from './SugerenciaStrategy.js';
import Database from '../../shared/db.js';

export class PorCategoriaStrategy implements SugerenciaStrategy {
  nombre = 'por_categoria';

  private readonly categoriasConocidas = [
    'analgesicos',
    'antibioticos',
    'antiinflamatorios',
    'antialergicos',
    'gastrointestinales',
    'antidiabeticos',
    'cardiovasculares',
    'respiratorios',
    'corticosteroides',
    'psicofarmacos',
    'suplementos',
  ];

  async buscar(query: string, medicamentos: IMedicamento[]): Promise<SugerenciaResult[]> {
    const q = query.toLowerCase().trim();

    const categoriaCoincidente = this.categoriasConocidas.find((cat) =>
      cat.includes(q) || q.includes(cat.slice(0, 4))
    );

    if (!categoriaCoincidente) return [];

    const pool = Database.getInstance().getPool();
    const catResult = await pool.query(
      "SELECT id FROM categorias WHERE LOWER(nombre) LIKE $1",
      [`%${categoriaCoincidente}%`]
    );

    if (catResult.rows.length === 0) return [];

    const categoriaId = catResult.rows[0].id;

    return medicamentos
      .filter((med) => med.active && med.categoria_id === categoriaId)
      .map((med) => ({
        _id: med._id.toString(),
        name: med.name,
        lab: med.lab,
        categoria_id: med.categoria_id,
        description: med.description,
        category: (med as any).categoria_nombre || (med as any).category || '',
        categoria_nombre: (med as any).categoria_nombre || (med as any).category || '',
        estrategiaUsada: this.nombre,
      }));
  }
}
