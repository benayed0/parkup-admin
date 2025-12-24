export interface Zone {
  _id: string;
  code: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  hourlyRate: number;
  operatingHours: string;
  prices: {
    car_sabot: number;
    pound: number;
  };
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZoneDto {
  code: string;
  name: string;
  coordinates: [number, number];
  hourlyRate: number;
  operatingHours: string;
  prices: {
    car_sabot: number;
    pound: number;
  };
  description?: string;
  isActive?: boolean;
}

export interface UpdateZoneDto {
  code?: string;
  name?: string;
  coordinates?: [number, number];
  hourlyRate?: number;
  operatingHours?: string;
  prices?: {
    car_sabot: number;
    pound: number;
  };
  description?: string;
  isActive?: boolean;
}
