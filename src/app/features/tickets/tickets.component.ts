import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { ApiService } from '../../core/services/api.service';
import {
  Ticket,
  TicketStatus,
  TicketReason,
} from '../../core/models/ticket.model';
import { Agent } from '../../core/models/agent.model';
import { LicensePlate } from '../../core/models/parking-session.model';
import {
  LicensePlateInputComponent,
  LicensePlateDisplayComponent,
} from '../../shared/components/license-plate-input';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LicensePlateInputComponent,
    LicensePlateDisplayComponent,
  ],
  template: `
    <div class="tickets-page">
      <header class="page-header">
        <div>
          <h1>Tickets</h1>
          <p>Liste des amendes de stationnement</p>
        </div>
      </header>

      <!-- View Tabs -->
      <div class="view-tabs">
        <button
          class="tab-btn"
          [class.active]="viewMode === 'list'"
          (click)="setViewMode('list')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          Liste
        </button>
        <button
          class="tab-btn"
          [class.active]="viewMode === 'map'"
          (click)="setViewMode('map')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
            <line x1="8" y1="2" x2="8" y2="18"></line>
            <line x1="16" y1="6" x2="16" y2="22"></line>
          </svg>
          Carte
        </button>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Statut</label>
          <select [(ngModel)]="filterStatus" (change)="loadTickets()">
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="paid">Payé</option>
            <option value="overdue">En retard</option>
            <option value="appealed">Contesté</option>
            <option value="dismissed">Annulé</option>
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
        </div>
      </div>

      @if (isLoading) {
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>
      } @else if (viewMode === 'list') {
      <!-- Desktop Table View -->
      <div class="table-container desktop-only">
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
                  <span
                    class="badge-icon"
                    [innerHTML]="getReasonIcon(ticket.reason)"
                  ></span>
                  {{ getReasonLabel(ticket.reason) }}
                </span>
              </td>
              <td class="amount">{{ ticket.fineAmount }} TND</td>
              <td>{{ getAgentName(ticket.agentId) }}</td>
              <td class="date">
                {{ ticket.issuedAt | date : 'dd/MM/yyyy HH:mm' }}
              </td>
              <td>
                <span class="status-badge" [attr.data-status]="ticket.status">
                  <span
                    class="badge-icon"
                    [innerHTML]="getStatusIcon(ticket.status)"
                  ></span>
                  {{ getStatusLabel(ticket.status) }}
                </span>
              </td>
              <td>
                <div class="actions">
                  @if (ticket.position?.coordinates) {
                  <button
                    class="btn-icon locate"
                    title="Voir sur la carte"
                    (click)="locateOnMap(ticket)"
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
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </button>
                  }
                  @if (ticket.status === 'pending' || ticket.status === 'overdue') {
                  <button
                    class="btn-icon paid"
                    title="Marquer comme payé"
                    (click)="payTicket(ticket)"
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
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </button>
                  }
                  @if (ticket.status === 'pending' || ticket.status === 'appealed') {
                  <button
                    class="btn-icon success"
                    title="Annuler"
                    (click)="dismissTicket(ticket)"
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
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </button>
                  }
                  <button
                    class="btn-icon danger"
                    title="Supprimer"
                    (click)="deleteTicket(ticket)"
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
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      ></path>
                    </svg>
                  </button>
                </div>
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

      <!-- Mobile Card View -->
      <div class="mobile-cards mobile-only">
        @for (ticket of tickets; track ticket._id) {
        <div class="mobile-card">
          <div class="card-header">
            <div class="card-plate">
              <app-license-plate-display
                [plateNumber]="ticket.licensePlate"
                [mini]="true"
                [scale]="0.85"
              ></app-license-plate-display>
            </div>
            <span class="status-badge" [attr.data-status]="ticket.status">
              <span
                class="badge-icon"
                [innerHTML]="getStatusIcon(ticket.status)"
              ></span>
              {{ getStatusLabel(ticket.status) }}
            </span>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">N° Ticket</span>
              <span class="card-value ticket-number">{{
                ticket.ticketNumber
              }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Montant</span>
              <span class="card-value amount">{{ ticket.fineAmount }} TND</span>
            </div>
            <div class="card-row">
              <span class="card-label">Raison</span>
              <span class="reason-badge" [attr.data-reason]="ticket.reason">
                <span
                  class="badge-icon"
                  [innerHTML]="getReasonIcon(ticket.reason)"
                ></span>
                {{ getReasonLabel(ticket.reason) }}
              </span>
            </div>
            <div class="card-row">
              <span class="card-label">Agent</span>
              <span class="card-value">{{ getAgentName(ticket.agentId) }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Date</span>
              <span class="card-value date">{{
                ticket.issuedAt | date : 'dd/MM/yyyy HH:mm'
              }}</span>
            </div>
          </div>
          <div class="card-actions">
            @if (ticket.position?.coordinates) {
            <button class="btn-action locate" (click)="locateOnMap(ticket)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Carte
            </button>
            }
            @if (ticket.status === 'pending' || ticket.status === 'overdue') {
            <button class="btn-action paid" (click)="payTicket(ticket)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Payé
            </button>
            }
            @if (ticket.status === 'pending' || ticket.status === 'appealed') {
            <button class="btn-action success" (click)="dismissTicket(ticket)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Annuler
            </button>
            }
            <button class="btn-action danger" (click)="deleteTicket(ticket)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
              Supprimer
            </button>
          </div>
        </div>
        } @empty {
        <div class="empty-state">
          <p>Aucun ticket trouvé</p>
        </div>
        }
      </div>

      <div class="table-footer">
        <span>{{ tickets.length }} ticket(s) affiché(s)</span>
      </div>
      } @else if (viewMode === 'map') {
      <!-- Map View -->
      <div class="map-container">
        <div id="tickets-map"></div>
        @if (tickets.length === 0) {
        <div class="map-empty-overlay">
          <p>Aucun ticket à afficher sur la carte</p>
        </div>
        }
      </div>
      <div class="table-footer">
        <span>{{ tickets.length }} ticket(s) sur la carte</span>
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

      .view-tabs {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
      }

      .tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        background: var(--app-surface);
        color: var(--app-text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tab-btn:hover {
        background: var(--app-surface-variant);
        color: var(--app-text-primary);
      }

      .tab-btn.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
      }

      .tab-btn svg {
        flex-shrink: 0;
      }

      .map-container {
        position: relative;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      #tickets-map {
        width: 100%;
        height: 500px;
      }

      .map-empty-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        color: var(--app-text-secondary);
      }

      /* Cluster marker styles */
      :host ::ng-deep .ticket-cluster {
        background: transparent;
      }

      :host ::ng-deep .ticket-cluster-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border: 3px solid white;
        border-radius: 50%;
        color: white;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(239, 68, 68, 0.3);
        animation: pulse-cluster 2s infinite;
      }

      @keyframes pulse-cluster {
        0%, 100% {
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(239, 68, 68, 0.3);
        }
        50% {
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.4), 0 0 0 6px rgba(239, 68, 68, 0.2);
        }
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
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .badge-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .badge-icon svg {
        width: 14px;
        height: 14px;
      }

      .reason-badge[data-reason='pound'] {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error);
      }

      .reason-badge[data-reason='car_sabot'] {
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning);
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .status-badge[data-status='PENDING'] {
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning);
      }

      .status-badge[data-status='PAID'] {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success);
      }

      .status-badge[data-status='OVERDUE'] {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error);
      }

      .status-badge[data-status='APPEALED'] {
        background: rgba(59, 130, 246, 0.1);
        color: var(--color-info);
      }

      .status-badge[data-status='DISMISSED'] {
        background: rgba(158, 158, 158, 0.1);
        color: #9e9e9e;
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

      .btn-icon.paid:hover {
        background: rgba(59, 130, 246, 0.2);
        color: var(--color-info);
      }

      .btn-icon.locate:hover {
        background: rgba(139, 92, 246, 0.2);
        color: #8b5cf6;
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

        .filter-group select,
        .search-box input {
          width: 100%;
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

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--app-surface-variant);
          border-bottom: 1px solid var(--app-border);
          gap: var(--spacing-sm);
        }

        .card-plate {
          flex-shrink: 0;
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
          text-align: right;
        }

        .card-value.ticket-number {
          font-family: monospace;
          color: var(--color-secondary);
        }

        .card-value.amount {
          font-weight: 600;
          color: var(--color-warning);
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

        .btn-action.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--color-success);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .btn-action.success:hover {
          background: rgba(34, 197, 94, 0.2);
        }

        .btn-action.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btn-action.danger:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .btn-action.paid {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-info);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .btn-action.paid:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .btn-action.locate {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.3);
        }

        .btn-action.locate:hover {
          background: rgba(139, 92, 246, 0.2);
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
export class TicketsComponent implements OnInit, OnDestroy, AfterViewInit {
  tickets: Ticket[] = [];
  allTickets: Ticket[] = []; // All tickets from API (filtered by status/agent)
  agents: Agent[] = [];
  isLoading = true;

  filterStatus = '';
  filterAgentId = '';
  searchPlate = '';
  searchPlateData: LicensePlate | null = null;

  viewMode: 'list' | 'map' = 'list';
  private map: L.Map | null = null;
  private markersLayer: L.MarkerClusterGroup | null = null;
  private ticketMarkers: Map<string, L.Marker> = new Map();
  private pendingLocateTicketId: string | null = null;

  message: { type: 'success' | 'error'; text: string } | null = null;

  private plateSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  private reasonLabels: Record<TicketReason, string> = {
    [TicketReason.POUND]: 'Fourrière',
    [TicketReason.CAR_SABOT]: 'Sabot',
  };

  private statusLabels: Record<TicketStatus, string> = {
    [TicketStatus.PENDING]: 'En attente',
    [TicketStatus.PAID]: 'Payé',
    [TicketStatus.OVERDUE]: 'En retard',
    [TicketStatus.APPEALED]: 'Contesté',
    [TicketStatus.DISMISSED]: 'Annulé',
  };

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadTickets();

    // Debounced plate search - filter locally for instant feedback
    this.plateSearch$
      .pipe(
        debounceTime(150), // Faster since it's local
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterTicketsLocally();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  ngAfterViewInit(): void {
    // Map will be initialized when switching to map view
  }

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode = mode;
    if (mode === 'map') {
      // Delay map init to allow DOM to render
      setTimeout(() => this.initMap(), 0);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.updateMapMarkers();
      return;
    }

    const mapElement = document.getElementById('tickets-map');
    if (!mapElement) return;

    // Default to Casablanca center
    this.map = L.map('tickets-map', {
      center: [33.5731, -7.5898],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Use MarkerClusterGroup to handle overlapping markers
    this.markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 50 : 60;
        return L.divIcon({
          html: `<div class="ticket-cluster-icon">${count}</div>`,
          className: 'ticket-cluster',
          iconSize: L.point(size, size),
        });
      },
    }).addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.ticketMarkers.clear();

    const bounds: L.LatLngBounds | null = this.tickets.length > 0 ? L.latLngBounds([]) : null;

    this.tickets.forEach((ticket) => {
      if (!ticket.position?.coordinates) return;

      const [lng, lat] = ticket.position.coordinates;
      const marker = L.marker([lat, lng], {
        icon: this.getMarkerIcon(ticket.status),
      });

      const popupContent = this.createPopupContent(ticket);
      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.addTo(this.markersLayer!);
      this.ticketMarkers.set(ticket._id, marker);
      bounds?.extend([lat, lng]);
    });

    // Check if there's a pending locate request
    if (this.pendingLocateTicketId) {
      const ticketId = this.pendingLocateTicketId;
      this.pendingLocateTicketId = null;
      setTimeout(() => this.focusOnTicket(ticketId), 100);
    } else if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  locateOnMap(ticket: Ticket): void {
    if (!ticket.position?.coordinates) return;

    // Switch to map view
    this.viewMode = 'map';
    this.pendingLocateTicketId = ticket._id;

    // Initialize map (will handle the locate after markers are created)
    setTimeout(() => this.initMap(), 0);
  }

  private focusOnTicket(ticketId: string): void {
    const marker = this.ticketMarkers.get(ticketId);
    if (!marker || !this.map) return;

    const latLng = marker.getLatLng();
    this.map.setView(latLng, 16, { animate: true });

    // Open the popup after a short delay to let the map animate
    setTimeout(() => {
      marker.openPopup();
    }, 300);
  }

  private getMarkerIcon(status: TicketStatus): L.Icon {
    const colorMap: Record<string, string> = {
      pending: '#f59e0b',
      paid: '#22c55e',
      overdue: '#ef4444',
      appealed: '#3b82f6',
      dismissed: '#9e9e9e',
    };

    const color = colorMap[status] || '#6b7280';

    return L.icon({
      iconUrl: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle fill="white" cx="12" cy="9" r="3"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }

  private createPopupContent(ticket: Ticket): string {
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 200px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #1e3a5f;">
          ${ticket.ticketNumber}
        </div>
        <div style="display: grid; gap: 6px; font-size: 13px;">
          <div><strong>Plaque:</strong> ${ticket.licensePlate}</div>
          <div><strong>Raison:</strong> ${this.getReasonLabel(ticket.reason)}</div>
          <div><strong>Montant:</strong> ${ticket.fineAmount} TND</div>
          <div><strong>Statut:</strong> ${this.getStatusLabel(ticket.status)}</div>
          <div><strong>Date:</strong> ${new Date(ticket.issuedAt).toLocaleString('fr-FR')}</div>
        </div>
      </div>
    `;
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
    // Include type in the search key so changing type also triggers search
    this.plateSearch$.next(`${plate.type}:${this.searchPlate}`);
  }

  loadTickets(): void {
    this.isLoading = true;
    const params: any = {};

    // Only send status/agent filters to API
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterAgentId) {
      params.agentId = this.filterAgentId;
    }

    this.apiService.getTickets(params).subscribe({
      next: ({ data }) => {
        this.allTickets = data;
        this.filterTicketsLocally();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.showMessage('error', 'Erreur lors du chargement des tickets');
        this.isLoading = false;
      },
    });
  }

  private filterTicketsLocally(): void {
    if (!this.searchPlateData || this.isPlateSearchEmpty()) {
      this.tickets = this.allTickets;
      this.updateMapMarkers();
      return;
    }

    const searchLeft = this.searchPlateData.left?.trim().toLowerCase() || '';
    const searchRight = this.searchPlateData.right?.trim().toLowerCase() || '';
    const searchType = this.searchPlateData.type;

    this.tickets = this.allTickets.filter((ticket) => {
      // If ticket has plate object, use structured search
      if (ticket.plate) {
        // Check plate type matches
        if (ticket.plate.type !== searchType) {
          return false;
        }

        // Check left part (starts with)
        if (searchLeft) {
          const ticketLeft = (ticket.plate.left || '').toLowerCase();
          if (!ticketLeft.startsWith(searchLeft)) {
            return false;
          }
        }

        // Check right part (starts with)
        if (searchRight) {
          const ticketRight = (ticket.plate.right || '').toLowerCase();
          if (!ticketRight.startsWith(searchRight)) {
            return false;
          }
        }

        return true;
      }

      // Fallback: search in licensePlate string for older tickets
      const licensePlate = ticket.licensePlate.toLowerCase();
      const searchTerm = (searchLeft + searchRight).toLowerCase();
      return searchTerm ? licensePlate.includes(searchTerm) : true;
    });

    this.updateMapMarkers();
  }

  private isPlateSearchEmpty(): boolean {
    if (!this.searchPlateData) return true;
    const hasLeft = this.searchPlateData.left?.trim();
    const hasRight = this.searchPlateData.right?.trim();
    return !hasLeft && !hasRight;
  }

  getReasonLabel(reason: TicketReason): string {
    return this.reasonLabels[reason] || reason;
  }

  getStatusLabel(status: TicketStatus): string {
    return this.statusLabels[status] || status;
  }

  getReasonIcon(reason: TicketReason): SafeHtml {
    const icons: Record<TicketReason, string> = {
      [TicketReason.POUND]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      [TicketReason.CAR_SABOT]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[reason] || '');
  }

  getStatusIcon(status: TicketStatus): SafeHtml {
    const icons: Record<TicketStatus, string> = {
      [TicketStatus.PENDING]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      [TicketStatus.PAID]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      [TicketStatus.OVERDUE]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      [TicketStatus.APPEALED]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      [TicketStatus.DISMISSED]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[status] || '');
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
        this.showMessage('error', "Erreur lors de l'annulation");
      },
    });
  }

  payTicket(ticket: Ticket): void {
    if (!confirm(`Marquer le ticket ${ticket.ticketNumber} comme payé ?`)) {
      return;
    }

    this.apiService.payTicket(ticket._id, 'cash').subscribe({
      next: ({ data }) => {
        const index = this.tickets.findIndex((t) => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = data;
        }
        // Also update allTickets for filtering consistency
        const allIndex = this.allTickets.findIndex((t) => t._id === ticket._id);
        if (allIndex !== -1) {
          this.allTickets[allIndex] = data;
        }
        this.showMessage('success', 'Ticket marqué comme payé');
      },
      error: (err) => {
        console.error('Error paying ticket:', err);
        this.showMessage('error', 'Erreur lors du paiement');
      },
    });
  }

  deleteTicket(ticket: Ticket): void {
    if (
      !confirm(`Supprimer définitivement le ticket ${ticket.ticketNumber} ?`)
    ) {
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
