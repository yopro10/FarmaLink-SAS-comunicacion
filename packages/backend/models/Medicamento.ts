export interface IMedicamento {
  _id: string;
  id: number;
  name: string;
  lab: string;
  active: boolean;
  description?: string;
  categoria_id?: number;
}
