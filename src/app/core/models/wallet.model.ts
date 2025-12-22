export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionReason {
  TOPUP = 'TOPUP',
  PARKING_PAYMENT = 'PARKING_PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  currency: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  reason: TransactionReason;
  referenceId?: string;
  balanceAfter: number;
  createdAt?: string;
}

export interface TopupWalletDto {
  amount: number;
  referenceId?: string;
}

export interface PayWalletDto {
  amount: number;
  reason?: TransactionReason;
  referenceId?: string;
}
