import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ParkingSession,
  ParkingSessionStatus,
  LicensePlate,
  PlateType,
} from '../../core/models/parking-session.model';
import { ParkingZone, ZoneOccupation } from '../../core/models/parking-zone.model';
import { PopulatedZone } from '../../core/models/operator.model';
import {
  LicensePlateInputComponent,
  LicensePlateDisplayComponent,
} from '../../shared/components/license-plate-input';

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
  imports: [
    CommonModule,
    FormsModule,
    LicensePlateInputComponent,
    LicensePlateDisplayComponent,
  ],
  template: `
    <div class="sessions-page">
      <header class="page-header">
        <div>
          <h1>Sessions de Stationnement</h1>
          <p>Gestion des sessions de stationnement en cours et historique</p>
        </div>
        <button class="btn-primary" (click)="updateExpiredSessions()">
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
              d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"
            />
          </svg>
          Mettre a jour les expirees
        </button>
      </header>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card active">
          <div class="stat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value"
              >{{ stats.todayRevenue | number : '1.2-2' }} DT</span
            >
            <span class="stat-label">Revenus aujourd'hui</span>
          </div>
        </div>

        <div class="stat-card total">
          <div class="stat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value"
              >{{ stats.totalRevenue | number : '1.2-2' }} DT</span
            >
            <span class="stat-label">Revenus total</span>
          </div>
        </div>

        <div class="stat-card duration">
          <div class="stat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 8 14"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value"
              >{{ stats.avgDuration | number : '1.0-0' }} min</span
            >
            <span class="stat-label">Duree moyenne</span>
          </div>
        </div>

        <div class="stat-card completed">
          <div class="stat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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

      <!-- Zone Occupation -->
      @if (zoneOccupations.length > 0) {
      <div class="occupation-section">
        <h3 class="occupation-title">Occupation des zones</h3>
        <div class="occupation-grid">
          @for (zone of zoneOccupations; track zone.zoneId) {
          <div class="occupation-card" [class.high]="zone.occupationRate >= 80" [class.medium]="zone.occupationRate >= 50 && zone.occupationRate < 80" [class.low]="zone.occupationRate < 50">
            <div class="occupation-header">
              <span class="zone-code">{{ zone.zoneCode }}</span>
              <span class="zone-name">{{ zone.zoneName }}</span>
            </div>
            <div class="occupation-bar-container">
              <div class="occupation-bar" [style.width.%]="zone.occupationRate"></div>
            </div>
            <div class="occupation-stats">
              <span class="occupation-count">{{ zone.activeSessions }} / {{ zone.numberOfPlaces }}</span>
              <span class="occupation-rate" [class.high]="zone.occupationRate >= 80">{{ zone.occupationRate | number:'1.0-0' }}%</span>
            </div>
          </div>
          }
        </div>
      </div>
      }

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
            <tr
              [class.active-row]="session.status === 'active'"
              [class.expired-row]="session.status === 'expired'"
            >
              <td class="plate">
                <app-license-plate-display
                  [plate]="session.plate"
                  [plateNumber]="session.licensePlate"
                  [mini]="true"
                  [scale]="0.9"
                ></app-license-plate-display>
              </td>
              <td>{{ session.zoneName }}</td>
              <td class="date">
                {{ session.startTime | date : 'dd/MM/yyyy HH:mm' }}
              </td>
              <td class="date" [class.overdue]="isOverdue(session)">
                {{ session.endTime | date : 'dd/MM/yyyy HH:mm' }}
                @if (isOverdue(session)) {
                <span class="overdue-badge">!</span>
                }
              </td>
              <td>{{ session.durationMinutes }} min</td>
              <td class="amount">{{ session.amount | number : '1.2-2' }} DT</td>
              <td>
                <span
                  class="status-badge"
                  [attr.data-status]="getEffectiveStatus(session)"
                >
                  {{ getStatusLabel(getEffectiveStatus(session)) }}
                  @if (isOverdue(session)) {
                  <span class="overdue-indicator">(depassee)</span>
                  }
                </span>
              </td>
              <td>
                <div class="actions">
                  @if (session.location?.coordinates) {
                  <button
                    class="btn-icon locate"
                    title="Voir sur la carte"
                    (click)="locateOnMap(session)"
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
                  @if (session.status === 'active') {
                  <button
                    class="btn-icon warning"
                    title="Prolonger"
                    (click)="openExtendModal(session)"
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </button>
                  <button
                    class="btn-icon success"
                    title="Terminer"
                    (click)="endSession(session)"
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
                  <button
                    class="btn-icon danger"
                    title="Annuler"
                    (click)="cancelSession(session)"
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </button>
                  }
                  <button
                    class="btn-icon danger"
                    title="Supprimer"
                    (click)="deleteSession(session)"
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
              <td colspan="8" class="empty">Aucune session trouvee</td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="mobile-cards mobile-only">
        @for (session of sessions; track session._id) {
        <div
          class="mobile-card"
          [class.active-card]="session.status === 'active'"
          [class.expired-card]="session.status === 'expired'"
        >
          <div class="card-header">
            <div class="card-plate">
              <app-license-plate-display
                [plate]="session.plate"
                [plateNumber]="session.licensePlate"
                [mini]="true"
                [scale]="0.85"
              ></app-license-plate-display>
            </div>
            <span
              class="status-badge"
              [attr.data-status]="getEffectiveStatus(session)"
            >
              {{ getStatusLabel(getEffectiveStatus(session)) }}
              @if (isOverdue(session)) {
              <span class="overdue-indicator">(depassee)</span>
              }
            </span>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">Zone</span>
              <span class="card-value zone-name">{{ session.zoneName }}</span>
            </div>
            <div class="card-row highlight">
              <span class="card-label">Montant</span>
              <span class="card-value amount"
                >{{ session.amount | number : '1.2-2' }} DT</span
              >
            </div>
            <div class="card-row">
              <span class="card-label">Duree</span>
              <span class="card-value">{{ session.durationMinutes }} min</span>
            </div>
            <div class="card-time-row">
              <div class="time-block">
                <span class="time-label">Debut</span>
                <span class="time-value">{{
                  session.startTime | date : 'dd/MM HH:mm'
                }}</span>
              </div>
              <div class="time-separator">→</div>
              <div class="time-block" [class.overdue]="isOverdue(session)">
                <span class="time-label">Fin</span>
                <span class="time-value">
                  {{ session.endTime | date : 'dd/MM HH:mm' }}
                  @if (isOverdue(session)) {
                  <span class="overdue-badge">!</span>
                  }
                </span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            @if (session.location?.coordinates) {
            <button class="btn-action locate" (click)="locateOnMap(session)">
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
            @if (session.status === 'active') {
            <button
              class="btn-action warning"
              (click)="openExtendModal(session)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Prolonger
            </button>
            <button class="btn-action success" (click)="endSession(session)">
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
              Terminer
            </button>
            <button class="btn-action danger" (click)="cancelSession(session)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </button>
            }
            <button class="btn-action danger" (click)="deleteSession(session)">
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
            </button>
          </div>
        </div>
        } @empty {
        <div class="empty-state">
          <p>Aucune session trouvee</p>
        </div>
        }
      </div>

      <div class="table-footer">
        <span
          >{{ sessions.length }} session(s) affichee(s) sur
          {{ stats.totalSessions }}</span
        >
      </div>
      } @else if (viewMode === 'map') {
      <!-- Map View -->
      <div class="map-container">
        <div id="sessions-map"></div>
        @if (sessions.length === 0) {
        <div class="map-empty-overlay">
          <p>Aucune session à afficher sur la carte</p>
        </div>
        }
      </div>
      <div class="table-footer">
        <span>{{ sessions.length }} session(s) sur la carte</span>
      </div>
      }

      <!-- Extend Modal -->
      @if (showExtendModal && selectedSession) {
      <div class="modal-overlay" (click)="closeExtendModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Prolonger la session</h2>
            <button class="close-btn" (click)="closeExtendModal()">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="session-info">
              <div class="info-row">
                <strong>Plaque:</strong>
                <app-license-plate-display
                  [plate]="selectedSession.plate"
                  [plateNumber]="selectedSession.licensePlate"
                  [mini]="true"
                ></app-license-plate-display>
              </div>
              <div class="info-row">
                <strong>Zone:</strong> {{ selectedSession.zoneName }}
              </div>
              <div class="info-row">
                <strong>Fin actuelle:</strong>
                {{ selectedSession.endTime | date : 'dd/MM/yyyy HH:mm' }}
              </div>
            </div>
            <div class="form-group">
              <label>Minutes supplementaires</label>
              <input
                type="number"
                [(ngModel)]="extendMinutes"
                min="1"
                placeholder="30"
              />
            </div>
            <div class="form-group">
              <label>Montant supplementaire (DT)</label>
              <input
                type="number"
                [(ngModel)]="extendAmount"
                min="0"
                step="0.1"
                placeholder="0.50"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeExtendModal()">
              Annuler
            </button>
            <button
              class="btn-primary"
              (click)="extendSession()"
              [disabled]="!extendMinutes || extendMinutes < 1"
            >
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
  styles: [
    `
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

      /* View Tabs */
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

      /* Map Container */
      .map-container {
        position: relative;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      #sessions-map {
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
      :host ::ng-deep .session-cluster {
        background: transparent;
      }

      :host ::ng-deep .session-cluster-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: 3px solid white;
        border-radius: 50%;
        color: white;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.3);
        animation: pulse-cluster 2s infinite;
      }

      @keyframes pulse-cluster {
        0%, 100% {
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
        50% {
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.4), 0 0 0 6px rgba(59, 130, 246, 0.2);
        }
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
        color: #9c27b0;
      }

      .stat-card.duration .stat-icon {
        background: rgba(37, 99, 235, 0.1);
        color: var(--color-secondary);
      }

      .stat-card.completed .stat-icon {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
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

      /* Zone Occupation */
      .occupation-section {
        margin-bottom: var(--spacing-xl);
      }

      .occupation-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--app-text-primary);
        margin: 0 0 var(--spacing-md) 0;
      }

      .occupation-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--spacing-md);
      }

      .occupation-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        transition: all 0.2s ease;
      }

      .occupation-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .occupation-card.high {
        border-left: 3px solid #ef4444;
      }

      .occupation-card.medium {
        border-left: 3px solid #f59e0b;
      }

      .occupation-card.low {
        border-left: 3px solid #22c55e;
      }

      .occupation-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
      }

      .zone-code {
        background: var(--color-secondary);
        color: white;
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 600;
      }

      .zone-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--app-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .occupation-bar-container {
        height: 8px;
        background: var(--app-surface-variant);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: var(--spacing-sm);
      }

      .occupation-bar {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
        background: linear-gradient(90deg, #22c55e 0%, #f59e0b 60%, #ef4444 100%);
      }

      .occupation-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .occupation-count {
        font-size: 0.813rem;
        color: var(--app-text-secondary);
      }

      .occupation-rate {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }

      .occupation-rate.high {
        color: #ef4444;
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
        min-width: 140px;
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
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .overdue-indicator {
        font-size: 0.625rem;
        opacity: 0.8;
        font-style: italic;
      }

      .status-badge[data-status='active'] {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success);
      }

      .status-badge[data-status='completed'] {
        background: rgba(59, 130, 246, 0.1);
        color: var(--color-info);
      }

      .status-badge[data-status='expired'] {
        background: rgba(245, 158, 11, 0.1);
        color: var(--color-warning);
      }

      .status-badge[data-status='cancelled'] {
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

      .btn-icon.warning:hover {
        background: rgba(245, 158, 11, 0.2);
        color: var(--color-warning);
      }

      .btn-icon.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        color: var(--color-error);
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
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .info-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .info-row strong {
        min-width: 100px;
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

        .mobile-card.active-card {
          border-left: 3px solid var(--color-success);
        }

        .mobile-card.expired-card {
          border-left: 3px solid var(--color-warning);
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

        .card-row.highlight {
          background: rgba(37, 99, 235, 0.05);
          margin: 0 calc(-1 * var(--spacing-md));
          padding: 8px var(--spacing-md);
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

        .card-value.zone-name {
          font-weight: 500;
          color: var(--color-secondary);
        }

        .card-value.amount {
          font-weight: 600;
          color: var(--color-secondary);
          font-size: 1rem;
        }

        .card-time-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          gap: var(--spacing-sm);
        }

        .time-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .time-label {
          font-size: 0.625rem;
          color: var(--app-text-secondary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .time-value {
          font-size: 0.813rem;
          color: var(--app-text-primary);
          font-weight: 500;
        }

        .time-block.overdue .time-value {
          color: var(--color-error);
        }

        .time-separator {
          color: var(--app-text-secondary);
          font-size: 1rem;
        }

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-top: 1px solid var(--app-border);
          background: var(--app-surface-variant);
        }

        .btn-action {
          flex: 1;
          min-width: calc(50% - var(--spacing-sm));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
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

        .btn-action.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-warning);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .btn-action.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          border-color: rgba(239, 68, 68, 0.3);
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

      @media (max-width: 480px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }

        .btn-action {
          min-width: calc(50% - var(--spacing-sm));
          font-size: 0.688rem;
          padding: 8px 10px;
        }
      }
    `,
  ],
})
export class ParkingSessionsComponent implements OnInit, OnDestroy, AfterViewInit {
  sessions: ParkingSession[] = [];
  allSessions: ParkingSession[] = [];
  zones: ParkingZone[] = [];
  zoneOccupations: ZoneOccupation[] = [];
  isLoading = true;

  filterStatus = '';
  filterZoneId = '';
  searchPlate = '';
  searchPlateData: LicensePlate | null = null;

  viewMode: 'list' | 'map' = 'list';
  private map: L.Map | null = null;
  private markersLayer: L.MarkerClusterGroup | null = null;
  private sessionMarkers: Map<string, L.Marker> = new Map();
  private pendingLocateSessionId: string | null = null;

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

  private plateSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

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

    // Debounced plate search - filter locally for instant feedback
    this.plateSearch$
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterSessionsLocally();
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
      setTimeout(() => this.initMap(), 0);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.updateMapMarkers();
      return;
    }

    const mapElement = document.getElementById('sessions-map');
    if (!mapElement) return;

    // Default to Tunisia center
    this.map = L.map('sessions-map', {
      center: [36.8065, 10.1815],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 50 : 60;
        return L.divIcon({
          html: `<div class="session-cluster-icon">${count}</div>`,
          className: 'session-cluster',
          iconSize: L.point(size, size),
        });
      },
    }).addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.sessionMarkers.clear();

    const bounds: L.LatLngBounds | null = this.sessions.length > 0 ? L.latLngBounds([]) : null;

    this.sessions.forEach((session) => {
      if (!session.location?.coordinates) return;

      const [lng, lat] = session.location.coordinates;
      const marker = L.marker([lat, lng], {
        icon: this.getMarkerIcon(session.status),
      });

      const popupContent = this.createPopupContent(session);
      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.addTo(this.markersLayer!);
      this.sessionMarkers.set(session._id, marker);
      bounds?.extend([lat, lng]);
    });

    if (this.pendingLocateSessionId) {
      const sessionId = this.pendingLocateSessionId;
      this.pendingLocateSessionId = null;
      setTimeout(() => this.focusOnSession(sessionId), 100);
    } else if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  locateOnMap(session: ParkingSession): void {
    if (!session.location?.coordinates) return;

    this.viewMode = 'map';
    this.pendingLocateSessionId = session._id;

    setTimeout(() => this.initMap(), 0);
  }

  private focusOnSession(sessionId: string): void {
    const marker = this.sessionMarkers.get(sessionId);
    if (!marker || !this.map) return;

    const latLng = marker.getLatLng();
    this.map.setView(latLng, 16, { animate: true });

    setTimeout(() => {
      marker.openPopup();
    }, 300);
  }

  private getMarkerIcon(status: ParkingSessionStatus): L.Icon {
    const colorMap: Record<string, string> = {
      active: '#22c55e',
      completed: '#3b82f6',
      expired: '#f59e0b',
      cancelled: '#9e9e9e',
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

  private createPopupContent(session: ParkingSession): string {
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 200px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #1e3a5f;">
          ${session.licensePlate}
        </div>
        <div style="display: grid; gap: 6px; font-size: 13px;">
          <div><strong>Zone:</strong> ${session.zoneName}</div>
          <div><strong>Durée:</strong> ${session.durationMinutes} min</div>
          <div><strong>Montant:</strong> ${session.amount} DT</div>
          <div><strong>Statut:</strong> ${this.getStatusLabel(session.status)}</div>
          <div><strong>Début:</strong> ${new Date(session.startTime).toLocaleString('fr-FR')}</div>
          <div><strong>Fin:</strong> ${new Date(session.endTime).toLocaleString('fr-FR')}</div>
        </div>
      </div>
    `;
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

  onPlateSearchChange(plate: LicensePlate): void {
    this.searchPlateData = plate;
    this.searchPlate = plate.formatted || '';
    // Trigger local filtering
    this.plateSearch$.next(`${plate.type}:${this.searchPlate}`);
  }

  loadSessions(): void {
    this.isLoading = true;
    const params: any = { limit: 500 };

    // Only send status/zone filters to API
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterZoneId) {
      params.zoneId = this.filterZoneId;
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

        // Apply local plate filter
        this.filterSessionsLocally();
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

  private filterSessionsLocally(): void {
    if (!this.searchPlateData || this.isPlateSearchEmpty()) {
      this.sessions = this.allSessions;
      return;
    }

    const searchLeft = this.searchPlateData.left?.trim().toLowerCase() || '';
    const searchRight = this.searchPlateData.right?.trim().toLowerCase() || '';
    const searchType = this.searchPlateData.type;

    this.sessions = this.allSessions.filter((session) => {
      // If session has plate object, use structured search
      if (session.plate) {
        // Check plate type matches
        if (session.plate.type !== searchType) {
          return false;
        }

        // Check left part (starts with)
        if (searchLeft) {
          const sessionLeft = (session.plate.left || '').toLowerCase();
          if (!sessionLeft.startsWith(searchLeft)) {
            return false;
          }
        }

        // Check right part (starts with)
        if (searchRight) {
          const sessionRight = (session.plate.right || '').toLowerCase();
          if (!sessionRight.startsWith(searchRight)) {
            return false;
          }
        }

        return true;
      }

      // Fallback: search in licensePlate string for older sessions
      const licensePlate = session.licensePlate.toLowerCase();
      const searchTerm = (searchLeft + searchRight).toLowerCase();
      return searchTerm ? licensePlate.includes(searchTerm) : true;
    });
  }

  private isPlateSearchEmpty(): boolean {
    if (!this.searchPlateData) return true;
    const hasLeft = this.searchPlateData.left?.trim();
    const hasRight = this.searchPlateData.right?.trim();
    return !hasLeft && !hasRight;
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
      totalRevenue: this.allSessions.reduce(
        (sum, s) => sum + (s.amount || 0),
        0
      ),
      avgDuration:
        this.allSessions.length > 0
          ? totalDuration / this.allSessions.length
          : 0,
      completedToday: completedTodaySessions.length,
      expiredToday: expiredTodaySessions.length,
    };

    this.calculateZoneOccupations();
  }

  private calculateZoneOccupations(): void {
    if (!this.zones.length) return;

    const activeSessionsByZone = new Map<string, number>();

    // Count active sessions per zone
    this.allSessions
      .filter((s) => s.status === ParkingSessionStatus.ACTIVE)
      .forEach((session) => {
        const count = activeSessionsByZone.get(session.zoneId) || 0;
        activeSessionsByZone.set(session.zoneId, count + 1);
      });

    // Calculate occupation for each zone
    this.zoneOccupations = this.zones
      .filter((zone) => zone.numberOfPlaces > 0)
      .map((zone) => {
        const activeSessions = activeSessionsByZone.get(zone._id) || 0;
        const occupationRate = Math.min(
          100,
          Math.round((activeSessions / zone.numberOfPlaces) * 100)
        );

        return {
          zoneId: zone._id,
          zoneName: zone.name,
          zoneCode: zone.code,
          numberOfPlaces: zone.numberOfPlaces,
          activeSessions,
          occupationRate,
        };
      })
      .sort((a, b) => b.occupationRate - a.occupationRate);
  }

  isOverdue(session: ParkingSession): boolean {
    if (session.status !== ParkingSessionStatus.ACTIVE) return false;
    return new Date(session.endTime) < new Date();
  }

  getStatusLabel(status: ParkingSessionStatus): string {
    return this.statusLabels[status] || status;
  }

  getEffectiveStatus(session: ParkingSession): ParkingSessionStatus {
    // If session is active but end time has passed, show as expired
    if (
      session.status === ParkingSessionStatus.ACTIVE &&
      new Date(session.endTime) < new Date()
    ) {
      return ParkingSessionStatus.EXPIRED;
    }
    return session.status;
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
    if (
      !this.selectedSession ||
      !this.extendMinutes ||
      this.extendMinutes < 1
    ) {
      return;
    }

    this.apiService
      .extendParkingSession(this.selectedSession._id, {
        additionalMinutes: this.extendMinutes,
        additionalAmount: this.extendAmount || 0,
      })
      .subscribe({
        next: ({ data }) => {
          const index = this.sessions.findIndex(
            (s) => s._id === this.selectedSession?._id
          );
          if (index !== -1) {
            this.sessions[index] = data;
          }
          const allIndex = this.allSessions.findIndex(
            (s) => s._id === this.selectedSession?._id
          );
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
        const allIndex = this.allSessions.findIndex(
          (s) => s._id === session._id
        );
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
        const allIndex = this.allSessions.findIndex(
          (s) => s._id === session._id
        );
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session annulee');
      },
      error: (err) => {
        console.error('Error cancelling session:', err);
        this.showMessage('error', "Erreur lors de l'annulation");
      },
    });
  }

  deleteSession(session: ParkingSession): void {
    if (
      !confirm(
        `Supprimer definitivement la session pour ${session.licensePlate} ?`
      )
    ) {
      return;
    }

    this.apiService.deleteParkingSession(session._id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s._id !== session._id);
        this.allSessions = this.allSessions.filter(
          (s) => s._id !== session._id
        );
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
        this.showMessage(
          'success',
          message || `${count} session(s) mise(s) a jour`
        );
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
