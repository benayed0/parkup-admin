export enum StreetType {
  FREE = 'FREE',
  PAYABLE = 'PAYABLE',
  PROHIBITED = 'PROHIBITED',
}

export interface Street {
  _id?: string;
  zoneId: string;
  type: StreetType;
  encodedPolyline: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStreetDto {
  zoneId: string;
  type: StreetType;
  encodedPolyline: string;
  isActive?: boolean;
}
