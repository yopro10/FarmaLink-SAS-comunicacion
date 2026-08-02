export interface IFarmacia {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  created_at: Date;
}

export interface FarmaciaGeoJSON {
  type: 'Point';
  coordinates: [number, number];
}

export interface IFarmaciaCreate {
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}
