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
  boundaries: number[][]; // Array of [longitude, latitude] pairs

  prices: {
    car_sabot: number;
    pound: number;
  };
  numberOfPlaces: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
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
  numberOfPlaces?: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
  isActive?: boolean;
  boundaries?: number[][];
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
  numberOfPlaces?: number;
  description?: string;
  address?: string;
  phoneNumber?: string;
  isActive?: boolean;
  boundaries?: number[][];
}
