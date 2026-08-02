/**
 * DTO (Data Transfer Object) para Precio.
 */

export interface UpdatePrecioDTO {
  precio: number;
  medicamento_id?: number;
}

export interface PrecioComparacionDTO {
  medicamento: {
    _id: string;
    name: string;
    lab: string;
    category?: string;
    description?: string;
  };
  mejorPrecio: {
    precio: number;
    farmaciaNombre: string;
    farmaciaId: string | object;
    fecha: Date;
  };
  listaOrdenada: {
    precioId: string;
    precio: number;
    farmaciaNombre: string;
    farmaciaId: string | object;
    fecha: Date;
    estrategiaUsada: string;
  }[];
}

export function validateUpdatePrecio(body: any): string[] {
  const errors: string[] = [];

  if (body.precio === undefined || body.precio === null) {
    errors.push('precio: requerido');
  } else if (typeof body.precio !== 'number' || isNaN(body.precio)) {
    errors.push('precio: debe ser un número');
  } else if (body.precio < 0) {
    errors.push('precio: no puede ser negativo');
  }

  if (body.medicamento_id !== undefined && typeof body.medicamento_id !== 'number') {
    errors.push('medicamento_id: debe ser un número');
  }

  return errors;
}
