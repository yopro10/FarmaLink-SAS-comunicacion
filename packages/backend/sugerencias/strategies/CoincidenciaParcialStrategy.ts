import { IMedicamento } from '../../models/Medicamento.js';
import { SugerenciaStrategy, SugerenciaResult } from './SugerenciaStrategy.js';

/**
 * Estrategia 1: Coincidencia Parcial
 * Busca medicamentos cuyo nombre comience con el query (startsWith, case-insensitive).
 * Es la más precisa y se activa por defecto cuando el usuario escribe el inicio del nombre.
 */
export class CoincidenciaParcialStrategy implements SugerenciaStrategy {
  nombre = 'coincidencia_parcial';

  buscar(query: string, medicamentos: IMedicamento[]): SugerenciaResult[] {
    const q = query.toLowerCase().trim();

    return medicamentos
      .filter((med) => med.active && med.name.toLowerCase().startsWith(q))
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
