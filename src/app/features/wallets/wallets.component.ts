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
  template: `
    <div class="wallets-page">
      <header class="page-header">
        <div>
          <h1>Portefeuilles</h1>
          <p>Gestion des portefeuilles utilisateurs</p>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab === 'wallets'"
          (click)="activeTab = 'wallets'; loadWallets()"
        >
          Portefeuilles
        </button>
        <button
          class="tab"
          [class.active]="activeTab === 'transactions'"
          (click)="activeTab = 'transactions'; loadTransactions()"
        >
          Transactions
        </button>
      </div>

      <!-- Wallets Tab -->
      @if (activeTab === 'wallets') { @if (isLoading) {
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>
      } @else {
      <!-- Desktop Table View -->
      <div class="table-container desktop-only">
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Telephone</th>
              <th>Solde</th>
              <th>Devise</th>
              <th>Derniere mise a jour</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (wallet of wallets; track wallet._id) {
            <tr>
              <td>
                @if (wallet.userId?.email) {
                {{ wallet.userId.email }}
                } @else {
                <span class="text-muted">Non renseigne</span>
                }
              </td>
              <td class="phone">{{ wallet.userId?.phone || 'N/A' }}</td>
              <td
                class="balance"
                [class.positive]="wallet.balance > 0"
                [class.zero]="wallet.balance === 0"
              >
                {{ wallet.balance | number : '1.2-2' }} {{ wallet.currency }}
              </td>
              <td>{{ wallet.currency }}</td>
              <td class="date">
                {{ wallet.updatedAt | date : 'dd/MM/yyyy HH:mm' }}
              </td>
              <td class="actions">
                <button
                  class="btn-icon"
                  title="Voir transactions"
                  (click)="viewUserTransactions(wallet)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    ></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  class="btn-icon success"
                  title="Crediter"
                  (click)="openCreditModal(wallet)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </td>
            </tr>
            } @empty {
            <tr>
              <td colspan="6" class="empty">Aucun portefeuille trouve</td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View for Wallets -->
      <div class="mobile-cards mobile-only">
        @for (wallet of wallets; track wallet._id) {
        <div class="mobile-card">
          <div class="card-header">
            <div class="wallet-info">
              <span class="wallet-phone">{{ wallet.userId?.phone || 'N/A' }}</span>
              @if (wallet.userId?.email) {
              <span class="wallet-email">{{ wallet.userId.email }}</span>
              }
            </div>
            <div class="wallet-balance" [class.positive]="wallet.balance > 0" [class.zero]="wallet.balance === 0">
              {{ wallet.balance | number : '1.2-2' }} {{ wallet.currency }}
            </div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">Derniere mise a jour</span>
              <span class="card-value date">{{ wallet.updatedAt | date : 'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-action primary" (click)="viewUserTransactions(wallet)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Transactions
            </button>
            <button class="btn-action success" (click)="openCreditModal(wallet)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Crediter
            </button>
          </div>
        </div>
        } @empty {
        <div class="empty-state">
          <p>Aucun portefeuille trouve</p>
        </div>
        }
      </div>

      <div class="table-footer">
        <span
          >{{ wallets.length }} portefeuille(s) affiche(s) sur
          {{ totalWallets }}</span
        >
      </div>
      } }

      <!-- Transactions Tab -->
      @if (activeTab === 'transactions') {
      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Type</label>
          <select [(ngModel)]="filterType" (change)="loadTransactions()">
            <option value="">Tous</option>
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Raison</label>
          <select [(ngModel)]="filterReason" (change)="loadTransactions()">
            <option value="">Toutes</option>
            <option value="TOPUP">Recharge</option>
            <option value="PARKING_PAYMENT">Paiement parking</option>
            <option value="REFUND">Remboursement</option>
            <option value="ADJUSTMENT">Ajustement</option>
          </select>
        </div>
      </div>

      @if (isLoading) {
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>
      } @else {
      <!-- Desktop Table View -->
      <div class="table-container desktop-only">
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Raison</th>
              <th>Solde apres</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of transactions; track tx._id) {
            <tr>
              <td>
                @if (tx.userId?.firstName || tx.userId?.lastName) {
                {{ tx.userId.firstName }} {{ tx.userId.lastName }}
                } @else {
                {{ tx.userId?.phone || 'N/A' }}
                }
              </td>
              <td>
                <span class="type-badge" [attr.data-type]="tx.type">
                  {{ getTypeLabel(tx.type) }}
                </span>
              </td>
              <td
                class="amount"
                [class.credit]="tx.type === 'CREDIT'"
                [class.debit]="tx.type === 'DEBIT'"
              >
                {{ tx.type === 'CREDIT' ? '+' : ''
                }}{{ tx.amount | number : '1.2-2' }} TND
              </td>
              <td>
                <span class="reason-badge" [attr.data-reason]="tx.reason">
                  {{ getReasonLabel(tx.reason) }}
                </span>
              </td>
              <td class="balance-after">
                {{ tx.balanceAfter | number : '1.2-2' }} TND
              </td>
              <td class="date">
                {{ tx.createdAt | date : 'dd/MM/yyyy HH:mm' }}
              </td>
            </tr>
            } @empty {
            <tr>
              <td colspan="6" class="empty">Aucune transaction trouvee</td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View for Transactions -->
      <div class="mobile-cards mobile-only">
        @for (tx of transactions; track tx._id) {
        <div class="mobile-card transaction-card" [class.credit-card]="tx.type === 'CREDIT'" [class.debit-card]="tx.type === 'DEBIT'">
          <div class="card-header">
            <div class="tx-user">
              @if (tx.userId?.firstName || tx.userId?.lastName) {
              {{ tx.userId.firstName }} {{ tx.userId.lastName }}
              } @else {
              {{ tx.userId?.phone || 'N/A' }}
              }
            </div>
            <span class="type-badge" [attr.data-type]="tx.type">
              {{ getTypeLabel(tx.type) }}
            </span>
          </div>
          <div class="card-body">
            <div class="tx-amount-row">
              <span class="tx-amount" [class.credit]="tx.type === 'CREDIT'" [class.debit]="tx.type === 'DEBIT'">
                {{ tx.type === 'CREDIT' ? '+' : '-' }}{{ tx.amount | number : '1.2-2' }} TND
              </span>
              <span class="reason-badge" [attr.data-reason]="tx.reason">
                {{ getReasonLabel(tx.reason) }}
              </span>
            </div>
            <div class="card-row">
              <span class="card-label">Solde apres</span>
              <span class="card-value">{{ tx.balanceAfter | number : '1.2-2' }} TND</span>
            </div>
            <div class="card-row">
              <span class="card-label">Date</span>
              <span class="card-value date">{{ tx.createdAt | date : 'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
        </div>
        } @empty {
        <div class="empty-state">
          <p>Aucune transaction trouvee</p>
        </div>
        }
      </div>

      <div class="table-footer">
        <span
          >{{ transactions.length }} transaction(s) affichee(s) sur
          {{ totalTransactions }}</span
        >
      </div>
      } }

      <!-- Credit Modal -->
      @if (showCreditModal && selectedWallet) {
      <div class="modal-overlay" (click)="closeCreditModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Crediter le portefeuille</h2>
            <button class="close-btn" (click)="closeCreditModal()">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p class="user-info">
              Utilisateur:
              <strong>{{ selectedWallet.userId?.phone }}</strong> @if
              (selectedWallet.userId?.firstName ||
              selectedWallet.userId?.lastName) { ({{
                selectedWallet.userId.firstName
              }}
              {{ selectedWallet.userId.lastName }}) }
            </p>
            <p class="current-balance">
              Solde actuel:
              <strong
                >{{ selectedWallet.balance | number : '1.2-2' }}
                {{ selectedWallet.currency }}</strong
              >
            </p>
            <div class="form-group">
              <label for="amount">Montant a crediter</label>
              <input
                type="number"
                id="amount"
                [(ngModel)]="creditAmount"
                min="0.01"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div class="form-group">
              <label for="reason">Raison</label>
              <select id="reason" [(ngModel)]="creditReason">
                <option value="ADJUSTMENT">Ajustement</option>
                <option value="REFUND">Remboursement</option>
                <option value="TOPUP">Recharge</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeCreditModal()">
              Annuler
            </button>
            <button
              class="btn btn-primary"
              [disabled]="!creditAmount || creditAmount <= 0"
              (click)="creditWallet()"
            >
              Crediter
            </button>
          </div>
        </div>
      </div>
      }

      <!-- User Transactions Modal -->
      @if (showUserTransactionsModal && selectedWallet) {
      <div class="modal-overlay" (click)="closeUserTransactionsModal()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Transactions de {{ selectedWallet.userId?.phone }}</h2>
            <button class="close-btn" (click)="closeUserTransactionsModal()">
              &times;
            </button>
          </div>
          <div class="modal-body">
            @if (isLoadingUserTransactions) {
            <div class="loading">
              <div class="spinner"></div>
              <p>Chargement...</p>
            </div>
            } @else {
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Raison</th>
                    <th>Solde apres</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of userTransactions; track tx._id) {
                  <tr>
                    <td>
                      <span class="type-badge" [attr.data-type]="tx.type">
                        {{ getTypeLabel(tx.type) }}
                      </span>
                    </td>
                    <td
                      class="amount"
                      [class.credit]="tx.type === 'CREDIT'"
                      [class.debit]="tx.type === 'DEBIT'"
                    >
                      {{ tx.type === 'CREDIT' ? '+' : ''
                      }}{{ tx.amount | number : '1.2-2' }} TND
                    </td>
                    <td>
                      <span class="reason-badge" [attr.data-reason]="tx.reason">
                        {{ getReasonLabel(tx.reason) }}
                      </span>
                    </td>
                    <td class="balance-after">
                      {{ tx.balanceAfter | number : '1.2-2' }} TND
                    </td>
                    <td class="date">
                      {{ tx.createdAt | date : 'dd/MM/yyyy HH:mm' }}
                    </td>
                  </tr>
                  } @empty {
                  <tr>
                    <td colspan="5" class="empty">Aucune transaction</td>
                  </tr>
                  }
                </tbody>
              </table>
            </div>
            }
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              (click)="closeUserTransactionsModal()"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
      }

      <!-- Toast Message -->
      @if (message) {
      <div class="toast" [class]="message.type">
        {{ message.text }}
      </div>
      }
    </div>
  `,
  styles: [
    `
      .wallets-page {
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: var(--spacing-xl);
      }

      .page-header h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }

      .page-header p {
        margin: var(--spacing-sm) 0 0;
        color: var(--app-text-secondary);
        font-size: 0.875rem;
      }

      .tabs {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--app-border);
        padding-bottom: var(--spacing-sm);
      }

      .tab {
        padding: 10px 20px;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--app-text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tab:hover {
        color: var(--app-text-primary);
        background: var(--app-surface-variant);
      }

      .tab.active {
        color: var(--color-secondary);
        background: rgba(37, 99, 235, 0.1);
      }

      .filters {
        display: flex;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .filter-group label {
        font-size: 0.75rem;
        color: var(--app-text-secondary);
        text-transform: uppercase;
      }

      .filter-group select {
        padding: 10px 12px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        color: var(--app-text-primary);
        font-size: 0.875rem;
        min-width: 160px;
      }

      .filter-group select:focus {
        outline: none;
        border-color: var(--color-secondary);
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 64px;
        color: var(--app-text-secondary);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--app-border);
        border-top-color: var(--color-secondary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: var(--spacing-md);
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .table-container {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-md);
        overflow-x: auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 800px;
      }

      .data-table th,
      .data-table td {
        padding: 14px var(--spacing-md);
        text-align: left;
      }

      .data-table th {
        background: var(--app-surface-variant);
        color: var(--app-text-secondary);
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        border-bottom: 1px solid var(--app-border);
        white-space: nowrap;
      }

      .data-table td {
        color: var(--app-text-primary);
        font-size: 0.875rem;
        border-bottom: 1px solid var(--app-border);
      }

      .data-table tr:last-child td {
        border-bottom: none;
      }

      .data-table tr:hover td {
        background: var(--app-surface-variant);
      }

      .phone {
        font-family: monospace;
        color: var(--color-secondary);
      }

      .balance {
        font-weight: 600;
      }

      .balance.positive {
        color: var(--color-success);
      }

      .balance.zero {
        color: var(--app-text-secondary);
      }

      .amount {
        font-weight: 600;
      }

      .amount.credit {
        color: var(--color-success);
      }

      .amount.debit {
        color: var(--color-error);
      }

      .balance-after {
        color: var(--app-text-secondary);
      }

      .date {
        color: var(--app-text-secondary);
        font-size: 0.813rem;
      }

      .text-muted {
        color: var(--app-text-secondary);
        font-style: italic;
      }

      .type-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .type-badge[data-type='CREDIT'] {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success);
      }

      .type-badge[data-type='DEBIT'] {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error);
      }

      .reason-badge {
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .reason-badge[data-reason='TOPUP'] {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success);
      }

      .reason-badge[data-reason='PARKING_PAYMENT'] {
        background: rgba(59, 130, 246, 0.1);
        color: var(--color-info);
      }

      .reason-badge[data-reason='REFUND'] {
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning);
      }

      .reason-badge[data-reason='ADJUSTMENT'] {
        background: rgba(156, 39, 176, 0.1);
        color: #9c27b0;
      }

      .actions {
        display: flex;
        gap: var(--spacing-sm);
      }

      .btn-icon {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--app-surface-variant);
        color: var(--app-text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .btn-icon:hover {
        background: var(--app-border);
        color: var(--app-text-primary);
      }

      .btn-icon.success:hover {
        background: rgba(34, 197, 94, 0.2);
        color: var(--color-success);
      }

      .empty {
        text-align: center;
        color: var(--app-text-secondary);
        padding: 40px !important;
      }

      .table-footer {
        padding: 12px var(--spacing-md);
        color: var(--app-text-secondary);
        font-size: 0.813rem;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: var(--app-surface);
        border-radius: var(--radius-md);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .modal.modal-lg {
        max-width: 800px;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--app-border);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--app-text-secondary);
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .close-btn:hover {
        color: var(--app-text-primary);
      }

      .modal-body {
        padding: var(--spacing-lg);
      }

      .user-info,
      .current-balance {
        margin: 0 0 var(--spacing-md);
        color: var(--app-text-secondary);
        font-size: 0.875rem;
      }

      .user-info strong,
      .current-balance strong {
        color: var(--app-text-primary);
      }

      .form-group {
        margin-bottom: var(--spacing-md);
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        color: var(--app-text-secondary);
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        color: var(--app-text-primary);
        font-size: 0.875rem;
      }

      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--color-secondary);
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
        border-top: 1px solid var(--app-border);
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-secondary {
        background: var(--app-surface-variant);
        color: var(--app-text-secondary);
      }

      .btn-secondary:hover {
        background: var(--app-border);
        color: var(--app-text-primary);
      }

      .btn-primary {
        background: var(--color-secondary);
        color: white;
      }

      .btn-primary:hover {
        opacity: 0.9;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Toast */
      .toast {
        position: fixed;
        bottom: var(--spacing-xl);
        right: var(--spacing-xl);
        padding: 14px var(--spacing-lg);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        z-index: 1001;
        animation: slideIn 0.3s ease;
      }

      .toast.success {
        background: var(--color-success);
        color: var(--color-text-on-primary);
      }

      .toast.error {
        background: var(--color-error);
        color: var(--color-text-on-primary);
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Responsive visibility */
      .desktop-only {
        display: block;
      }

      .mobile-only {
        display: none;
      }

      @media (max-width: 768px) {
        .desktop-only {
          display: none !important;
        }

        .mobile-only {
          display: block !important;
        }

        .filters {
          flex-direction: column;
        }

        .filter-group select {
          width: 100%;
        }

        .modal {
          margin: var(--spacing-md);
          max-width: calc(100% - 2 * var(--spacing-md));
        }

        /* Mobile Cards */
        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .mobile-card {
          background: var(--app-surface);
          border: 1px solid var(--app-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .mobile-card.credit-card {
          border-left: 3px solid var(--color-success);
        }

        .mobile-card.debit-card {
          border-left: 3px solid var(--color-error);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--app-surface-variant);
          border-bottom: 1px solid var(--app-border);
          gap: var(--spacing-sm);
        }

        /* Wallet Card Specific Styles */
        .wallet-info {
          display: flex;
          flex-direction: column;
        }

        .wallet-phone {
          font-size: 1rem;
          font-weight: 600;
          font-family: monospace;
          color: var(--color-secondary);
        }

        .wallet-email {
          font-size: 0.75rem;
          color: var(--app-text-secondary);
        }

        .wallet-balance {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--app-text-primary);
        }

        .wallet-balance.positive {
          color: var(--color-success);
        }

        .wallet-balance.zero {
          color: var(--app-text-secondary);
        }

        /* Transaction Card Specific Styles */
        .tx-user {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--app-text-primary);
        }

        .tx-amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--app-border);
        }

        .tx-amount {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .tx-amount.credit {
          color: var(--color-success);
        }

        .tx-amount.debit {
          color: var(--color-error);
        }

        .card-body {
          padding: var(--spacing-md);
        }

        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--app-border);
        }

        .card-row:last-child {
          border-bottom: none;
        }

        .card-label {
          font-size: 0.75rem;
          color: var(--app-text-secondary);
          text-transform: uppercase;
          font-weight: 500;
        }

        .card-value {
          font-size: 0.875rem;
          color: var(--app-text-primary);
        }

        .card-value.date {
          color: var(--app-text-secondary);
          font-size: 0.813rem;
        }

        .card-actions {
          display: flex;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-top: 1px solid var(--app-border);
          background: var(--app-surface-variant);
        }

        .btn-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.813rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--app-surface);
          color: var(--app-text-primary);
          border: 1px solid var(--app-border);
        }

        .btn-action.primary {
          background: rgba(37, 99, 235, 0.1);
          color: var(--color-secondary);
          border-color: rgba(37, 99, 235, 0.3);
        }

        .btn-action.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--color-success);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .empty-state {
          text-align: center;
          padding: 40px var(--spacing-md);
          color: var(--app-text-secondary);
          background: var(--app-surface);
          border: 1px solid var(--app-border);
          border-radius: var(--radius-md);
        }
      }
    `,
  ],
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
