export interface ParkingZone {
  _id: string;
  code: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
