export interface Zone {
  _id: string;
  code: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
