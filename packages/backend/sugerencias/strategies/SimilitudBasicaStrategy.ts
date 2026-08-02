import { IMedicamento } from '../../models/Medicamento.js';
import { SugerenciaStrategy, SugerenciaResult } from './SugerenciaStrategy.js';

/**
 * Estrategia 3: Similitud Básica (includes)
 * Busca medicamentos donde el query aparezca en cualquier parte del nombre,
 * laboratorio o descripción. Es la más amplia y se usa como fallback
 * cuando las estrategias anteriores no devuelven resultados.
 */
export class SimilitudBasicaStrategy implements SugerenciaStrategy {
  nombre = 'similitud_basica';

  buscar(query: string, medicamentos: IMedicamento[]): SugerenciaResult[] {
    const q = query.toLowerCase().trim();

    return medicamentos
      .filter(
        (med) =>
          med.active &&
          (med.name.toLowerCase().includes(q) ||
            med.lab.toLowerCase().includes(q) ||
            (med.description?.toLowerCase().includes(q) ?? false))
      )
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
