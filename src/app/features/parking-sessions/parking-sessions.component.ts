import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ParkingSession,
  ParkingSessionStatus,
} from '../../core/models/parking-session.model';
import { ParkingZone } from '../../core/models/parking-zone.model';
import { PopulatedZone } from '../../core/models/operator.model';

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  todaySessions: number;
  todayRevenue: number;
  totalRevenue: number;
  avgDuration: number;
  completedToday: number;
  expiredToday: number;
}

@Component({
  selector: 'app-parking-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sessions-page">
      <header class="page-header">
        <div>
          <h1>Sessions de Stationnement</h1>
          <p>Gestion des sessions de stationnement en cours et historique</p>
        </div>
        <button class="btn-primary" (click)="updateExpiredSessions()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
          </svg>
          Mettre a jour les expirees
        </button>
      </header>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card active">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.activeSessions }}</span>
            <span class="stat-label">Sessions actives</span>
          </div>
        </div>

        <div class="stat-card today">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.todaySessions }}</span>
            <span class="stat-label">Sessions aujourd'hui</span>
          </div>
        </div>

        <div class="stat-card revenue">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.todayRevenue | number:'1.2-2' }} DT</span>
            <span class="stat-label">Revenus aujourd'hui</span>
          </div>
        </div>

        <div class="stat-card total">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.totalRevenue | number:'1.2-2' }} DT</span>
            <span class="stat-label">Revenus total</span>
          </div>
        </div>

        <div class="stat-card duration">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 8 14"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.avgDuration | number:'1.0-0' }} min</span>
            <span class="stat-label">Duree moyenne</span>
          </div>
        </div>

        <div class="stat-card completed">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.completedToday }}</span>
            <span class="stat-label">Terminees aujourd'hui</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Statut</label>
          <select [(ngModel)]="filterStatus" (change)="loadSessions()">
            <option value="">Tous</option>
            <option value="active">Active</option>
            <option value="completed">Terminee</option>
            <option value="expired">Expiree</option>
            <option value="cancelled">Annulee</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Zone</label>
          <select [(ngModel)]="filterZoneId" (change)="loadSessions()">
            <option value="">Toutes les zones</option>
            @for (zone of zones; track zone._id) {
              <option [value]="zone._id">{{ zone.name }}</option>
            }
          </select>
        </div>
        <div class="search-box">
          <input
            type="text"
            placeholder="Rechercher par plaque..."
            [(ngModel)]="searchPlate"
            (keyup.enter)="loadSessions()"
          />
        </div>
      </div>

      @if (isLoading) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Chargement...</p>
        </div>
      } @else {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Plaque</th>
                <th>Zone</th>
                <th>Debut</th>
                <th>Fin</th>
                <th>Duree</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (session of sessions; track session._id) {
                <tr [class.active-row]="session.status === 'active'" [class.expired-row]="session.status === 'expired'">
                  <td class="plate">{{ session.licensePlate }}</td>
                  <td>{{ session.zoneName }}</td>
                  <td class="date">{{ session.startTime | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="date" [class.overdue]="isOverdue(session)">
                    {{ session.endTime | date:'dd/MM/yyyy HH:mm' }}
                    @if (isOverdue(session)) {
                      <span class="overdue-badge">!</span>
                    }
                  </td>
                  <td>{{ session.durationMinutes }} min</td>
                  <td class="amount">{{ session.amount | number:'1.2-2' }} DT</td>
                  <td>
                    <span class="status-badge" [attr.data-status]="session.status">
                      {{ getStatusLabel(session.status) }}
                    </span>
                  </td>
                  <td class="actions">
                    @if (session.status === 'active') {
                      <button class="btn-icon warning" title="Prolonger" (click)="openExtendModal(session)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </button>
                      <button class="btn-icon success" title="Terminer" (click)="endSession(session)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </button>
                      <button class="btn-icon danger" title="Annuler" (click)="cancelSession(session)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </button>
                    }
                    <button class="btn-icon danger" title="Supprimer" (click)="deleteSession(session)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty">Aucune session trouvee</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>{{ sessions.length }} session(s) affichee(s) sur {{ stats.totalSessions }}</span>
        </div>
      }

      <!-- Extend Modal -->
      @if (showExtendModal && selectedSession) {
        <div class="modal-overlay" (click)="closeExtendModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Prolonger la session</h2>
              <button class="close-btn" (click)="closeExtendModal()">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="session-info">
                <strong>Plaque:</strong> {{ selectedSession.licensePlate }}<br>
                <strong>Zone:</strong> {{ selectedSession.zoneName }}<br>
                <strong>Fin actuelle:</strong> {{ selectedSession.endTime | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <div class="form-group">
                <label>Minutes supplementaires</label>
                <input type="number" [(ngModel)]="extendMinutes" min="1" placeholder="30">
              </div>
              <div class="form-group">
                <label>Montant supplementaire (DT)</label>
                <input type="number" [(ngModel)]="extendAmount" min="0" step="0.1" placeholder="0.50">
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeExtendModal()">Annuler</button>
              <button class="btn-primary" (click)="extendSession()" [disabled]="!extendMinutes || extendMinutes < 1">
                Prolonger
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
  styles: [`
    .sessions-page {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
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

    .btn-primary {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 10px var(--spacing-md);
      background: var(--color-secondary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      background: var(--app-border);
      cursor: not-allowed;
    }

    /* Statistics Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .stat-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.active .stat-icon {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    .stat-card.today .stat-icon {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }

    .stat-card.revenue .stat-icon {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .stat-card.total .stat-icon {
      background: rgba(156, 39, 176, 0.1);
      color: #9C27B0;
    }

    .stat-card.duration .stat-icon {
      background: rgba(37, 99, 235, 0.1);
      color: var(--color-secondary);
    }

    .stat-card.completed .stat-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--app-text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.813rem;
      color: var(--app-text-secondary);
      margin-top: 4px;
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

    .filter-group select,
    .search-box input {
      padding: 10px 12px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      color: var(--app-text-primary);
      font-size: 0.875rem;
      min-width: 160px;
    }

    .filter-group select:focus,
    .search-box input:focus {
      outline: none;
      border-color: var(--color-secondary);
    }

    .search-box {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .search-box input {
      min-width: 200px;
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
      to { transform: rotate(360deg); }
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
      min-width: 900px;
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

    .data-table tr.active-row td {
      background: rgba(34, 197, 94, 0.05);
    }

    .data-table tr.active-row:hover td {
      background: rgba(34, 197, 94, 0.1);
    }

    .data-table tr.expired-row td {
      background: rgba(245, 158, 11, 0.05);
    }

    .data-table tr.expired-row:hover td {
      background: rgba(245, 158, 11, 0.1);
    }

    .plate {
      font-family: monospace;
      font-weight: 600;
      letter-spacing: 1px;
    }

    .amount {
      font-weight: 600;
      color: var(--color-secondary);
    }

    .date {
      color: var(--app-text-secondary);
      font-size: 0.813rem;
    }

    .date.overdue {
      color: var(--color-error);
      font-weight: 500;
    }

    .overdue-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: var(--color-error);
      color: white;
      border-radius: 50%;
      font-size: 0.625rem;
      font-weight: 700;
      margin-left: 4px;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge[data-status="active"] {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    .status-badge[data-status="completed"] {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }

    .status-badge[data-status="expired"] {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .status-badge[data-status="cancelled"] {
      background: rgba(158, 158, 158, 0.1);
      color: #9E9E9E;
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

    .btn-icon.warning:hover {
      background: rgba(245, 158, 11, 0.2);
      color: var(--color-warning);
    }

    .btn-icon.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: var(--color-error);
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
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--app-border);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--app-text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-sm);
    }

    .close-btn:hover {
      background: var(--app-surface-variant);
      color: var(--app-text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .session-info {
      margin: 0 0 var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--app-surface-variant);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      line-height: 1.6;
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

    .form-group input {
      width: 100%;
      padding: 10px 12px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      color: var(--app-text-primary);
      font-size: 0.875rem;
    }

    .form-group input:focus {
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

    .btn-secondary {
      padding: 10px var(--spacing-md);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      color: var(--app-text-primary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: var(--app-surface-variant);
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
      color: white;
    }

    .toast.error {
      background: var(--color-error);
      color: white;
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

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .stat-card {
        padding: var(--spacing-md);
      }

      .stat-value {
        font-size: 1.25rem;
      }

      .filters {
        flex-direction: column;
      }

      .filter-group select,
      .search-box input {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ParkingSessionsComponent implements OnInit {
  sessions: ParkingSession[] = [];
  allSessions: ParkingSession[] = [];
  zones: ParkingZone[] = [];
  isLoading = true;

  filterStatus = '';
  filterZoneId = '';
  searchPlate = '';

  showExtendModal = false;
  selectedSession: ParkingSession | null = null;
  extendMinutes: number = 30;
  extendAmount: number = 0.5;

  message: { type: 'success' | 'error'; text: string } | null = null;

  stats: SessionStats = {
    totalSessions: 0,
    activeSessions: 0,
    todaySessions: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    avgDuration: 0,
    completedToday: 0,
    expiredToday: 0,
  };

  private statusLabels: Record<ParkingSessionStatus, string> = {
    [ParkingSessionStatus.ACTIVE]: 'Active',
    [ParkingSessionStatus.COMPLETED]: 'Terminee',
    [ParkingSessionStatus.EXPIRED]: 'Expiree',
    [ParkingSessionStatus.CANCELLED]: 'Annulee',
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadZones();
    this.loadSessions();
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

  loadZones(): void {
    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => {
        this.zones = data;
      },
      error: (err) => console.error('Error loading zones:', err),
    });
  }

  loadSessions(): void {
    this.isLoading = true;
    const params: any = { limit: 500 };

    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterZoneId) {
      params.zoneId = this.filterZoneId;
    }
    if (this.searchPlate.trim()) {
      params.licensePlate = this.searchPlate.trim().toUpperCase();
    }

    this.apiService.getParkingSessions(params).subscribe({
      next: ({ data }) => {
        // Filter sessions by operator's zones if not super_admin
        if (!this.isSuperAdmin) {
          const allowedZoneIds = this.operatorZoneIds;
          this.allSessions = data.filter((session) =>
            allowedZoneIds.includes(session.zoneId)
          );
        } else {
          this.allSessions = data;
        }

        // Apply current filters for display
        this.sessions = this.allSessions;
        this.calculateStats();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.showMessage('error', 'Erreur lors du chargement des sessions');
        this.isLoading = false;
      },
    });
  }

  private calculateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySessions = this.allSessions.filter((s) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= today;
    });

    const completedTodaySessions = todaySessions.filter(
      (s) => s.status === ParkingSessionStatus.COMPLETED
    );

    const expiredTodaySessions = todaySessions.filter(
      (s) => s.status === ParkingSessionStatus.EXPIRED
    );

    const activeSessions = this.allSessions.filter(
      (s) => s.status === ParkingSessionStatus.ACTIVE
    );

    const totalDuration = this.allSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    this.stats = {
      totalSessions: this.allSessions.length,
      activeSessions: activeSessions.length,
      todaySessions: todaySessions.length,
      todayRevenue: todaySessions.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalRevenue: this.allSessions.reduce((sum, s) => sum + (s.amount || 0), 0),
      avgDuration:
        this.allSessions.length > 0
          ? totalDuration / this.allSessions.length
          : 0,
      completedToday: completedTodaySessions.length,
      expiredToday: expiredTodaySessions.length,
    };
  }

  isOverdue(session: ParkingSession): boolean {
    if (session.status !== ParkingSessionStatus.ACTIVE) return false;
    return new Date(session.endTime) < new Date();
  }

  getStatusLabel(status: ParkingSessionStatus): string {
    return this.statusLabels[status] || status;
  }

  openExtendModal(session: ParkingSession): void {
    this.selectedSession = session;
    this.extendMinutes = 30;
    this.extendAmount = 0.5;
    this.showExtendModal = true;
  }

  closeExtendModal(): void {
    this.showExtendModal = false;
    this.selectedSession = null;
  }

  extendSession(): void {
    if (!this.selectedSession || !this.extendMinutes || this.extendMinutes < 1) {
      return;
    }

    this.apiService.extendParkingSession(this.selectedSession._id, {
      additionalMinutes: this.extendMinutes,
      additionalAmount: this.extendAmount || 0,
    }).subscribe({
      next: ({ data }) => {
        const index = this.sessions.findIndex((s) => s._id === this.selectedSession?._id);
        if (index !== -1) {
          this.sessions[index] = data;
        }
        const allIndex = this.allSessions.findIndex((s) => s._id === this.selectedSession?._id);
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session prolongee avec succes');
        this.closeExtendModal();
      },
      error: (err) => {
        console.error('Error extending session:', err);
        this.showMessage('error', 'Erreur lors de la prolongation');
      },
    });
  }

  endSession(session: ParkingSession): void {
    if (!confirm(`Terminer la session pour ${session.licensePlate} ?`)) {
      return;
    }

    this.apiService.endParkingSession(session._id).subscribe({
      next: ({ data }) => {
        const index = this.sessions.findIndex((s) => s._id === session._id);
        if (index !== -1) {
          this.sessions[index] = data;
        }
        const allIndex = this.allSessions.findIndex((s) => s._id === session._id);
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session terminee');
      },
      error: (err) => {
        console.error('Error ending session:', err);
        this.showMessage('error', 'Erreur lors de la terminaison');
      },
    });
  }

  cancelSession(session: ParkingSession): void {
    if (!confirm(`Annuler la session pour ${session.licensePlate} ?`)) {
      return;
    }

    this.apiService.cancelParkingSession(session._id).subscribe({
      next: ({ data }) => {
        const index = this.sessions.findIndex((s) => s._id === session._id);
        if (index !== -1) {
          this.sessions[index] = data;
        }
        const allIndex = this.allSessions.findIndex((s) => s._id === session._id);
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session annulee');
      },
      error: (err) => {
        console.error('Error cancelling session:', err);
        this.showMessage('error', 'Erreur lors de l\'annulation');
      },
    });
  }

  deleteSession(session: ParkingSession): void {
    if (!confirm(`Supprimer definitivement la session pour ${session.licensePlate} ?`)) {
      return;
    }

    this.apiService.deleteParkingSession(session._id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s._id !== session._id);
        this.allSessions = this.allSessions.filter((s) => s._id !== session._id);
        this.calculateStats();
        this.showMessage('success', 'Session supprimee');
      },
      error: (err) => {
        console.error('Error deleting session:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
      },
    });
  }

  updateExpiredSessions(): void {
    this.apiService.updateExpiredSessions().subscribe({
      next: ({ count, message }) => {
        this.showMessage('success', message || `${count} session(s) mise(s) a jour`);
        this.loadSessions();
      },
      error: (err) => {
        console.error('Error updating expired sessions:', err);
        this.showMessage('error', 'Erreur lors de la mise a jour');
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
