export enum StreetType {
  FREE = 'FREE',
  PAYABLE = 'PAYABLE',
  PROHIBITED = 'PROHIBITED',
}

export interface Street {
  _id?: string;
  zoneId: string;
  leftType: StreetType;
  rightType: StreetType;
  name?: string;
  encodedPolyline: string;
  matchedEncodedPolyline?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStreetDto {
  zoneId: string;
  leftType: StreetType;
  rightType: StreetType;
  name?: string;
  encodedPolyline: string;
  isActive?: boolean;
}
