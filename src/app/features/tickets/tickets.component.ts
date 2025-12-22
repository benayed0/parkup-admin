import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Ticket, TicketStatus, TicketReason } from '../../core/models/ticket.model';
import { Agent } from '../../core/models/agent.model';
import { LicensePlate } from '../../core/models/parking-session.model';
import {
  LicensePlateInputComponent,
  LicensePlateDisplayComponent,
} from '../../shared/components/license-plate-input';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, LicensePlateInputComponent, LicensePlateDisplayComponent],
  template: `
    <div class="tickets-page">
      <header class="page-header">
        <div>
          <h1>Tickets</h1>
          <p>Liste des amendes de stationnement</p>
        </div>
      </header>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Statut</label>
          <select [(ngModel)]="filterStatus" (change)="loadTickets()">
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="PAID">Payé</option>
            <option value="OVERDUE">En retard</option>
            <option value="APPEALED">Contesté</option>
            <option value="DISMISSED">Annulé</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Agent</label>
          <select [(ngModel)]="filterAgentId" (change)="loadTickets()">
            <option value="">Tous les agents</option>
            @for (agent of agents; track agent._id) {
              <option [value]="agent._id">{{ agent.name }}</option>
            }
          </select>
        </div>
        <div class="plate-search-box">
          <app-license-plate-input
            label="Rechercher par plaque"
            [showTypeSelector]="true"
            [compactTypeSelector]="true"
            [showPreview]="false"
            (plateChange)="onPlateSearchChange($event)"
          ></app-license-plate-input>
          <button class="btn-search" (click)="loadTickets()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
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
                <th>N° Ticket</th>
                <th>Plaque</th>
                <th>Raison</th>
                <th>Montant</th>
                <th>Agent</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (ticket of tickets; track ticket._id) {
                <tr>
                  <td class="ticket-number">{{ ticket.ticketNumber }}</td>
                  <td class="plate">
                    <app-license-plate-display
                      [plateNumber]="ticket.licensePlate"
                      [mini]="true"
                      [scale]="0.9"
                    ></app-license-plate-display>
                  </td>
                  <td>
                    <span class="reason-badge" [attr.data-reason]="ticket.reason">
                      {{ getReasonLabel(ticket.reason) }}
                    </span>
                  </td>
                  <td class="amount">{{ ticket.fineAmount }} DH</td>
                  <td>{{ getAgentName(ticket.agentId) }}</td>
                  <td class="date">{{ ticket.issuedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <span class="status-badge" [attr.data-status]="ticket.status">
                      {{ getStatusLabel(ticket.status) }}
                    </span>
                  </td>
                  <td class="actions">
                    @if (ticket.status === 'PENDING' || ticket.status === 'APPEALED') {
                      <button class="btn-icon success" title="Annuler" (click)="dismissTicket(ticket)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </button>
                    }
                    <button class="btn-icon danger" title="Supprimer" (click)="deleteTicket(ticket)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty">Aucun ticket trouvé</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>{{ tickets.length }} ticket(s) affiché(s)</span>
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
    .tickets-page {
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

    .plate-search-box {
      display: flex;
      align-items: flex-end;
      gap: var(--spacing-sm);
    }

    .btn-search {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--color-secondary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-search:hover {
      background: #1d4ed8;
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

    .ticket-number {
      font-family: monospace;
      color: var(--color-secondary);
      font-size: 0.813rem;
    }

    .plate {
      min-width: 140px;
    }

    .amount {
      font-weight: 600;
      color: var(--color-warning);
    }

    .date {
      color: var(--app-text-secondary);
      font-size: 0.813rem;
    }

    .reason-badge {
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .reason-badge[data-reason="NO_SESSION"] {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
    }

    .reason-badge[data-reason="EXPIRED_SESSION"] {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .reason-badge[data-reason="OVERSTAYED"] {
      background: rgba(156, 39, 176, 0.1);
      color: #9C27B0;
    }

    .reason-badge[data-reason="WRONG_ZONE"] {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge[data-status="PENDING"] {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .status-badge[data-status="PAID"] {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    .status-badge[data-status="OVERDUE"] {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
    }

    .status-badge[data-status="APPEALED"] {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }

    .status-badge[data-status="DISMISSED"] {
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

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
      }

      .filter-group select,
      .search-box input {
        width: 100%;
      }
    }
  `]
})
export class TicketsComponent implements OnInit {
  tickets: Ticket[] = [];
  agents: Agent[] = [];
  isLoading = true;

  filterStatus = '';
  filterAgentId = '';
  searchPlate = '';
  searchPlateData: LicensePlate | null = null;

  message: { type: 'success' | 'error'; text: string } | null = null;

  private reasonLabels: Record<TicketReason, string> = {
    [TicketReason.NO_SESSION]: 'Sans session',
    [TicketReason.EXPIRED_SESSION]: 'Session expirée',
    [TicketReason.OVERSTAYED]: 'Dépassement',
    [TicketReason.WRONG_ZONE]: 'Mauvaise zone',
  };

  private statusLabels: Record<TicketStatus, string> = {
    [TicketStatus.PENDING]: 'En attente',
    [TicketStatus.PAID]: 'Payé',
    [TicketStatus.OVERDUE]: 'En retard',
    [TicketStatus.APPEALED]: 'Contesté',
    [TicketStatus.DISMISSED]: 'Annulé',
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadTickets();
  }

  loadAgents(): void {
    this.apiService.getAgents().subscribe({
      next: ({ data }) => {
        this.agents = data;
      },
      error: (err) => console.error('Error loading agents:', err),
    });
  }

  onPlateSearchChange(plate: LicensePlate): void {
    this.searchPlateData = plate;
    this.searchPlate = plate.formatted || '';
  }

  loadTickets(): void {
    this.isLoading = true;
    const params: any = {};

    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterAgentId) {
      params.agentId = this.filterAgentId;
    }
    // Use formatted plate string for search
    const plateSearch = this.searchPlateData?.formatted || this.searchPlate;
    if (plateSearch.trim()) {
      params.licensePlate = plateSearch.trim().toUpperCase();
    }

    this.apiService.getTickets(params).subscribe({
      next: ({ data }) => {
        this.tickets = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.showMessage('error', 'Erreur lors du chargement des tickets');
        this.isLoading = false;
      },
    });
  }

  getReasonLabel(reason: TicketReason): string {
    return this.reasonLabels[reason] || reason;
  }

  getStatusLabel(status: TicketStatus): string {
    return this.statusLabels[status] || status;
  }

  getAgentName(agentId: Agent | string): string {
    if (typeof agentId === 'object' && agentId !== null) {
      return agentId.name;
    }
    const agent = this.agents.find((a) => a._id === agentId);
    return agent?.name || 'Inconnu';
  }

  dismissTicket(ticket: Ticket): void {
    if (!confirm(`Annuler le ticket ${ticket.ticketNumber} ?`)) {
      return;
    }

    this.apiService.dismissTicket(ticket._id).subscribe({
      next: ({ data }) => {
        const index = this.tickets.findIndex((t) => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = data;
        }
        this.showMessage('success', 'Ticket annulé');
      },
      error: (err) => {
        console.error('Error dismissing ticket:', err);
        this.showMessage('error', 'Erreur lors de l\'annulation');
      },
    });
  }

  deleteTicket(ticket: Ticket): void {
    if (!confirm(`Supprimer définitivement le ticket ${ticket.ticketNumber} ?`)) {
      return;
    }

    this.apiService.deleteTicket(ticket._id).subscribe({
      next: () => {
        this.tickets = this.tickets.filter((t) => t._id !== ticket._id);
        this.showMessage('success', 'Ticket supprimé');
      },
      error: (err) => {
        console.error('Error deleting ticket:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
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
