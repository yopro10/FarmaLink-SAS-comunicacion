import { IMedicamento } from '../../models/Medicamento.js';

export interface SugerenciaResult {
  _id: string;
  name: string;
  lab: string;
  category?: string;
  categoria_nombre?: string;
  description?: string;
  estrategiaUsada: string;
}

export interface SugerenciaStrategy {
  nombre: string;
  buscar(query: string, medicamentos: IMedicamento[]): SugerenciaResult[] | Promise<SugerenciaResult[]>;
}
