export interface SeasonalPeriod {
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  is24h: boolean;
  hoursFrom?: string;
  hoursTo?: string;
}

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
  seasonalOperatingHours?: SeasonalPeriod[];
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
  seasonalOperatingHours?: SeasonalPeriod[];
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
  seasonalOperatingHours?: SeasonalPeriod[];
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
