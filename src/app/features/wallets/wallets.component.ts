import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  WalletTransaction,
  TransactionType,
  TransactionReason,
} from '../../core/models/wallet.model';
import { PopulatedZone } from '../../core/models/operator.model';

interface PopulatedUser {
  _id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface WalletWithUser {
  _id: string;
  userId: PopulatedUser;
  balance: number;
  currency: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TransactionWithUser {
  _id: string;
  userId: PopulatedUser;
  amount: number;
  type: TransactionType;
  reason: TransactionReason;
  referenceId?: string;
  balanceAfter: number;
  createdAt?: string;
}

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallets.component.html',
  styleUrl: './wallets.component.css',
})
export class WalletsComponent implements OnInit {
  activeTab: 'wallets' | 'transactions' = 'wallets';

  wallets: WalletWithUser[] = [];
  transactions: TransactionWithUser[] = [];
  userTransactions: WalletTransaction[] = [];

  totalWallets = 0;
  totalTransactions = 0;

  isLoading = true;
  isLoadingUserTransactions = false;

  filterType = '';
  filterReason = '';

  showCreditModal = false;
  showUserTransactionsModal = false;
  selectedWallet: WalletWithUser | null = null;
  creditAmount: number = 0;
  creditReason: TransactionReason = TransactionReason.ADJUSTMENT;

  message: { type: 'success' | 'error'; text: string } | null = null;

  private typeLabels: Record<TransactionType, string> = {
    [TransactionType.CREDIT]: 'Credit',
    [TransactionType.DEBIT]: 'Debit',
  };

  private reasonLabels: Record<TransactionReason, string> = {
    [TransactionReason.TOPUP]: 'Recharge',
    [TransactionReason.PARKING_PAYMENT]: 'Paiement parking',
    [TransactionReason.REFUND]: 'Remboursement',
    [TransactionReason.ADJUSTMENT]: 'Ajustement',
  };

  private allowedUserIds: Set<string> = new Set();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeData();
  }

  get isSuperAdmin(): boolean {
    return this.authService.currentOperator?.role === 'super_admin';
  }

  get operatorZoneIds(): string[] {
    const operator = this.authService.currentOperator;
    if (!operator?.zoneIds) return [];
    return operator.zoneIds.map((zone) =>
      typeof zone === 'string' ? zone : (zone as PopulatedZone)._id
    );
  }

  private initializeData(): void {
    if (this.isSuperAdmin) {
      // Super admin sees all wallets
      this.loadWallets();
    } else {
      // Non-super admin: first load sessions to get allowed user IDs
      this.loadAllowedUsersAndWallets();
    }
  }

  private loadAllowedUsersAndWallets(): void {
    this.isLoading = true;
    const zoneIds = this.operatorZoneIds;

    if (zoneIds.length === 0) {
      this.wallets = [];
      this.totalWallets = 0;
      this.isLoading = false;
      return;
    }

    // Load parking sessions for operator's zones to get allowed user IDs
    this.apiService.getParkingSessions({ limit: 1000 }).subscribe({
      next: ({ data: sessions }) => {
        // Filter sessions by operator's zones and extract unique userIds
        this.allowedUserIds = new Set(
          sessions
            .filter((s) => zoneIds.includes(s.zoneId) && s.userId)
            .map((s) => s.userId as string)
        );
        this.loadWallets();
      },
      error: (err) => {
        console.error('Error loading sessions for user filtering:', err);
        this.loadWallets();
      },
    });
  }

  loadWallets(): void {
    this.isLoading = true;
    this.apiService.getWallets({ limit: 100 }).subscribe({
      next: ({ data, total }) => {
        let wallets = data as unknown as WalletWithUser[];

        // Filter wallets by allowed user IDs for non-super_admin
        if (!this.isSuperAdmin && this.allowedUserIds.size > 0) {
          wallets = wallets.filter((wallet) => {
            const userId = this.getUserId(wallet);
            return userId && this.allowedUserIds.has(userId);
          });
        } else if (!this.isSuperAdmin && this.allowedUserIds.size === 0) {
          // Non-super_admin with no sessions in their zones - show no wallets
          wallets = [];
        }

        this.wallets = wallets;
        this.totalWallets = this.isSuperAdmin ? total : wallets.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading wallets:', err);
        this.showMessage(
          'error',
          'Erreur lors du chargement des portefeuilles'
        );
        this.isLoading = false;
      },
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    const params: any = { limit: 100 };

    if (this.filterType) {
      params.type = this.filterType;
    }
    if (this.filterReason) {
      params.reason = this.filterReason;
    }

    this.apiService.getWalletTransactions(params).subscribe({
      next: ({ data, total }) => {
        let transactions = data as unknown as TransactionWithUser[];

        // Filter transactions by allowed user IDs for non-super_admin
        if (!this.isSuperAdmin && this.allowedUserIds.size > 0) {
          transactions = transactions.filter((tx) => {
            const userId =
              typeof tx.userId === 'string' ? tx.userId : tx.userId?._id;
            return userId && this.allowedUserIds.has(userId);
          });
        } else if (!this.isSuperAdmin && this.allowedUserIds.size === 0) {
          transactions = [];
        }

        this.transactions = transactions;
        this.totalTransactions = this.isSuperAdmin ? total : transactions.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.showMessage('error', 'Erreur lors du chargement des transactions');
        this.isLoading = false;
      },
    });
  }

  getTypeLabel(type: TransactionType): string {
    return this.typeLabels[type] || type;
  }

  getReasonLabel(reason: TransactionReason): string {
    return this.reasonLabels[reason] || reason;
  }

  getUserId(wallet: WalletWithUser): string | null {
    if (!wallet.userId) return null;
    if (typeof wallet.userId === 'string') return wallet.userId;
    return wallet.userId._id || null;
  }

  viewUserTransactions(wallet: WalletWithUser): void {
    console.log(wallet);

    const userId = this.getUserId(wallet);
    if (!userId) {
      this.showMessage('error', 'ID utilisateur non disponible');
      return;
    }

    this.selectedWallet = wallet;
    this.showUserTransactionsModal = true;
    this.isLoadingUserTransactions = true;

    this.apiService.getUserWalletTransactions(userId, { limit: 50 }).subscribe({
      next: ({ data }) => {
        this.userTransactions = data;
        this.isLoadingUserTransactions = false;
      },
      error: (err) => {
        console.error('Error loading user transactions:', err);
        this.showMessage('error', 'Erreur lors du chargement des transactions');
        this.isLoadingUserTransactions = false;
      },
    });
  }

  closeUserTransactionsModal(): void {
    this.showUserTransactionsModal = false;
    this.selectedWallet = null;
    this.userTransactions = [];
  }

  openCreditModal(wallet: WalletWithUser): void {
    this.selectedWallet = wallet;
    this.creditAmount = 0;
    this.creditReason = TransactionReason.ADJUSTMENT;
    this.showCreditModal = true;
  }

  closeCreditModal(): void {
    this.showCreditModal = false;
    this.selectedWallet = null;
    this.creditAmount = 0;
  }

  creditWallet(): void {
    if (!this.selectedWallet || !this.creditAmount || this.creditAmount <= 0) {
      return;
    }

    const userId = this.getUserId(this.selectedWallet);
    if (!userId) {
      this.showMessage('error', 'ID utilisateur non disponible');
      return;
    }

    this.apiService
      .creditUserWallet(userId, this.creditAmount, this.creditReason)
      .subscribe({
        next: () => {
          this.showMessage('success', 'Portefeuille credite avec succes');
          this.closeCreditModal();
          this.loadWallets();
        },
        error: (err) => {
          console.error('Error crediting wallet:', err);
          this.showMessage('error', 'Erreur lors du credit du portefeuille');
        },
      });
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
