import { Agent } from './agent.model';

export enum TicketReason {
  NO_SESSION = 'NO_SESSION',
  EXPIRED_SESSION = 'EXPIRED_SESSION',
  OVERSTAYED = 'OVERSTAYED',
  WRONG_ZONE = 'WRONG_ZONE',
}

export enum TicketStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  APPEALED = 'APPEALED',
  DISMISSED = 'DISMISSED',
  OVERDUE = 'OVERDUE',
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
