export interface IPrecioHistorial {
  id: number;
  precio_id: number;
  medicamento_id: number;
  farmacia_id: number;
  precio_anterior: number;
  precio_nuevo: number;
  fecha_cambio: Date;
}
