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
  numberOfPlaces: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneOccupation {
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  numberOfPlaces: number;
  activeSessions: number;
  occupationRate: number; // 0-100
}
