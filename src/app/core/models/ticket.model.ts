import { Agent } from './agent.model';
import { LicensePlate } from './parking-session.model';

export enum TicketReason {
  POUND = 'pound',
  CAR_SABOT = 'car_sabot',
}

export enum TicketStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SABOT_REMOVED = 'sabot_removed',
  APPEALED = 'appealed',
  DISMISSED = 'dismissed',
  OVERDUE = 'overdue',
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
  CASH = 'CASH',
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  position: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  parkingSessionId?: string;
  userId?: string;
  agentId: Agent | string;
  plate?: LicensePlate;
  licensePlate: string;
  reason: TicketReason;
  fineAmount: number;
  status: TicketStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  evidencePhotos?: string[];
  appealReason?: string;
  appealedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketStats {
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  totalFines: number;
  unpaidFines: number;
}
