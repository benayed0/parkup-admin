import { ParkingZone } from './parking-zone.model';

export interface Agent {
  _id: string;
  agentCode: string;
  name: string;
  username: string;
  phone?: string;
  assignedZones?: ParkingZone[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgentDto {
  agentCode: string;
  name: string;
  username: string;
  phone?: string;
  password: string;
  assignedZones?: string[];
  isActive?: boolean;
}

export interface UpdateAgentDto {
  agentCode?: string;
  name?: string;
  username?: string;
  phone?: string;
  assignedZones?: string[];
  isActive?: boolean;
}
