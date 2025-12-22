export enum ParkingSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PlateType {
  TUNIS = 'tunis',
  RS = 'rs',
  GOVERNMENT = 'government',
  LIBYA = 'libya',
  ALGERIA = 'algeria',
  EU = 'eu',
  OTHER = 'other',
  CMD = 'cmd',
  CD = 'cd',
  MD = 'md',
  PAT = 'pat',
  CC = 'cc',
  MC = 'mc',
}

export enum PlateCategory {
  REGULAR = 'regular',
  GOVERNMENT = 'government',
  DIPLOMATIC = 'diplomatic',
  CONSULAR = 'consular',
  EU = 'eu',
  LIBYA = 'libya',
  ALGERIA = 'algeria',
  OTHER = 'other',
}

export interface LicensePlate {
  type: PlateType;
  category: PlateCategory;
  left?: string;
  right?: string;
  formatted: string;
}

export interface ParkingSession {
  _id: string;
  userId?: string;
  zoneId: string;
  zoneName: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  plate?: LicensePlate;
  licensePlate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  amount: number;
  status: ParkingSessionStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateParkingSessionDto {
  userId?: string;
  zoneId: string;
  zoneName: string;
  coordinates: [number, number];
  plate?: {
    type: PlateType;
    left?: string;
    right?: string;
  };
  licensePlate?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  amount: number;
  status?: ParkingSessionStatus;
}

export interface UpdateParkingSessionDto {
  userId?: string;
  zoneId?: string;
  zoneName?: string;
  coordinates?: [number, number];
  endTime?: string;
  durationMinutes?: number;
  amount?: number;
  status?: ParkingSessionStatus;
}

export interface ExtendParkingSessionDto {
  additionalMinutes: number;
  additionalAmount: number;
}
