export interface ParkingZone {
  _id: string;
  code: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  hourlyRate: number;
  operatingHours: string;
  prices: {
    car_sabot: number;
    pound: number;
  };
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
