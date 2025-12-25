import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-draw';

// Fix Leaflet default marker icon paths
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
import { ZonesService } from '../../core/services/zones.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Zone, CreateZoneDto } from '../../core/models/zone.model';
import {
  Street,
  StreetType,
  CreateStreetDto,
} from '../../core/models/street.model';
import {
  encodePolyline,
  decodePolyline,
} from '../../core/utils/polyline.utils';

function getPolylineLatLngs(polyline: L.Polyline): L.LatLng[] {
  const latLngs = polyline.getLatLngs();
  if (latLngs.length > 0 && Array.isArray(latLngs[0])) {
    return (latLngs as L.LatLng[][]).flat();
  }
  return latLngs as L.LatLng[];
}

interface DrawnStreet {
  layer: L.Polyline;
  type: StreetType;
  id?: string;
}

interface ZoneBoundary {
  layer: L.Polygon;
  coordinates: number[][];
  originalCoordinates?: number[][]; // Track original for comparison
}

type ViewMode = 'list' | 'streets';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="zones-page">
      <!-- List View -->
      @if (viewMode === 'list') {
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Zones</h1>
          <p>Gerez les zones de stationnement et leurs rues</p>
        </div>
        @if (canManageZones) {
        <button class="btn btn-primary" (click)="openCreateModal()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nouvelle Zone
        </button>
        }
      </div>

      @if (isLoading) {
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement des zones...</p>
      </div>
      } @else if (error) {
      <div class="error-state">
        <p>{{ error }}</p>
        <button class="btn btn-secondary" (click)="loadZones()">
          Reessayer
        </button>
      </div>
      } @else {
      <div class="zones-grid">
        @for (zone of zones; track zone._id) {
        <div class="zone-card" [class.inactive]="!zone.isActive">
          <div class="zone-header">
            <div class="zone-code-badge">{{ zone.code }}</div>
            <div class="zone-info">
              <h3>{{ zone.name }}</h3>
              <p class="zone-description">
                {{ zone.description || 'Aucune description' }}
              </p>
            </div>
            <span
              class="status-badge"
              [class.active]="zone.isActive"
              [class.inactive]="!zone.isActive"
            >
              {{ zone.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>

          <div class="zone-details">
            <div class="detail-row">
              <div class="detail-item">
                <span class="label">Tarif horaire</span>
                <span class="value">{{ zone.hourlyRate }} TND/h</span>
              </div>
              <div class="detail-item">
                <span class="label">Horaires</span>
                <span class="value">{{ zone.operatingHours }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-item">
                <span class="label">Sabot</span>
                <span class="value">{{ zone.prices?.car_sabot || 0 }} TND</span>
              </div>
              <div class="detail-item">
                <span class="label">Fourriere</span>
                <span class="value">{{ zone.prices?.pound || 0 }} TND</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-item">
                <span class="label">Places</span>
                <span class="value">{{ zone.numberOfPlaces || 0 }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Occupation</span>
                <span class="value">--</span>
              </div>
            </div>
          </div>

          <div class="zone-actions">
            <button
              class="btn btn-sm btn-info"
              (click)="openStreetsEditor(zone)"
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
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Rues
            </button>
            @if (canManageZones) {
            <button
              class="btn btn-sm btn-secondary"
              (click)="openEditModal(zone)"
            >
              Modifier
            </button>
            @if (zone.isActive) {
            <button class="btn btn-sm btn-warning" (click)="toggleStatus(zone)">
              Desactiver
            </button>
            } @else {
            <button class="btn btn-sm btn-success" (click)="toggleStatus(zone)">
              Activer
            </button>
            }
            <button class="btn btn-sm btn-danger" (click)="confirmDelete(zone)">
              Supprimer
            </button>
            }
          </div>
        </div>
        } @empty {
        <div class="empty-state">
          <p>Aucune zone trouvee</p>
        </div>
        }
      </div>
      } }

      <!-- Streets Editor View -->
      @if (viewMode === 'streets' && selectedZone) {
      <div class="editor-container">
        <aside class="sidebar" [class.open]="sidebarOpen">
          <div class="sidebar-header">
            <button class="back-btn" (click)="closeStreetsEditor()">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Retour
            </button>
            <button class="close-sidebar" (click)="sidebarOpen = false">
              &times;
            </button>
          </div>

          <div class="zone-summary">
            <div class="zone-code-badge large">{{ selectedZone.code }}</div>
            <h2>{{ selectedZone.name }}</h2>
            <p>{{ selectedZone.description || 'Aucune description' }}</p>
          </div>

          <!-- Street Type Selector -->
          <div class="section">
            <label>Type de rue a dessiner</label>
            <div class="street-types">
              @for (type of streetTypes; track type.value) {
              <button
                class="type-btn"
                [class.active]="selectedStreetType === type.value"
                [style.border-color]="type.color"
                [style.background-color]="
                  selectedStreetType === type.value ? type.color : 'transparent'
                "
                (click)="selectedStreetType = type.value; onStreetTypeChange()"
              >
                <span
                  class="color-dot"
                  [style.background-color]="type.color"
                ></span>
                {{ type.label }}
              </button>
              }
            </div>
          </div>

          <!-- Zone Boundary Section -->
          <div class="section">
            <label>Limite de zone</label>
            <div class="boundary-controls">
              @if (zoneBoundary) {
                <div class="boundary-status has-boundary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Limite definie ({{ zoneBoundary.coordinates.length }} points)
                </div>
                <div class="boundary-actions">
                  @if (isEditingBoundary) {
                    <button class="btn btn-sm btn-success" (click)="finishEditingBoundary()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Terminer
                    </button>
                    <button class="btn btn-sm btn-secondary" (click)="cancelEditingBoundary()">
                      Annuler
                    </button>
                  } @else {
                    <button class="btn btn-sm btn-info" (click)="startEditingBoundary()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Modifier
                    </button>
                    <button class="btn btn-sm btn-danger-outline" (click)="clearBoundary()">
                      Effacer
                    </button>
                  }
                </div>
                @if (isEditingBoundary) {
                  <p class="hint edit-hint">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Glissez les points pour modifier la limite
                  </p>
                }
              } @else {
                <div class="boundary-status no-boundary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  Aucune limite
                </div>
                <p class="hint">Utilisez l'outil polygone pour dessiner la limite</p>
              }
              @if (hasUnsavedBoundary()) {
                <button
                  class="btn btn-sm btn-success full-width"
                  [disabled]="isSavingBoundary || isEditingBoundary"
                  (click)="saveBoundary()"
                >
                  @if (isSavingBoundary) { Sauvegarde... } @else { Sauvegarder limite }
                </button>
              }
            </div>
          </div>

          <!-- Statistics -->
          <div class="section stats">
            <div class="stat">
              <span class="stat-value">{{ getExistingStreetsCount() }}</span>
              <span class="stat-label">Rues existantes</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ getNewStreetsCount() }}</span>
              <span class="stat-label">Nouvelles rues</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="section actions">
            <button
              class="btn btn-primary"
              [disabled]="isSaving || getNewStreetsCount() === 0"
              (click)="saveStreets()"
            >
              @if (isSaving) { Sauvegarde... } @else { Sauvegarder ({{
                getNewStreetsCount()
              }}) }
            </button>

            <button
              class="btn btn-secondary"
              [disabled]="drawnStreets.length === 0"
              (click)="clearMap()"
            >
              Effacer la carte
            </button>

            <button
              class="btn btn-danger-outline"
              [disabled]="isSaving || getExistingStreetsCount() === 0"
              (click)="deleteAllStreets()"
            >
              Supprimer tout
            </button>
          </div>

          <!-- Instructions -->
          <div class="section instructions">
            <h3>Instructions</h3>
            <ol>
              <li>Selectionnez le type de rue</li>
              <li>Cliquez sur l'icone ligne dans la carte</li>
              <li>Dessinez la rue point par point</li>
              <li>Double-cliquez pour terminer</li>
              <li>Sauvegardez vos modifications</li>
            </ol>
          </div>

          <!-- Message -->
          @if (mapMessage) {
          <div class="message" [class]="mapMessage.type">
            {{ mapMessage.text }}
          </div>
          }
        </aside>

        <!-- Mobile Toggle -->
        <button
          class="sidebar-toggle"
          (click)="sidebarOpen = !sidebarOpen"
          [class.open]="sidebarOpen"
        >
          <span class="toggle-icon"></span>
        </button>

        @if (sidebarOpen) {
        <div class="sidebar-backdrop" (click)="sidebarOpen = false"></div>
        }

        <!-- Map -->
        <main class="map-container">
          <div id="streets-map"></div>
          @if (isLoadingStreets) {
          <div class="loading-overlay">
            <div class="spinner"></div>
            <p>Chargement des rues...</p>
          </div>
          }
        </main>
      </div>
      }

      <!-- Create/Edit Zone Modal -->
      @if (showModal) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingZone ? 'Modifier la Zone' : 'Nouvelle Zone' }}</h2>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <form (ngSubmit)="saveZone()" class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label for="code">Code</label>
                <input
                  type="text"
                  id="code"
                  [(ngModel)]="formData.code"
                  name="code"
                  required
                  placeholder="Ex: TUN01"
                  [disabled]="!!editingZone"
                />
              </div>
              <div class="form-group">
                <label for="name">Nom</label>
                <input
                  type="text"
                  id="name"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  placeholder="Nom de la zone"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                [(ngModel)]="formData.description"
                name="description"
                rows="2"
                placeholder="Description optionnelle"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Emplacement</label>
              <div class="location-picker">
                <div id="location-picker-map" class="picker-map"></div>
                <div class="location-info">
                  @if (formData.latitude && formData.longitude) {
                    <span class="coords">{{ formData.latitude | number:'1.4-4' }}, {{ formData.longitude | number:'1.4-4' }}</span>
                  } @else {
                    <span class="coords-placeholder">Cliquez sur la carte pour definir l'emplacement</span>
                  }
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="hourlyRate">Tarif horaire (TND)</label>
                <input
                  type="number"
                  id="hourlyRate"
                  [(ngModel)]="formData.hourlyRate"
                  name="hourlyRate"
                  required
                  min="0"
                  step="0.1"
                  placeholder="1.5"
                />
              </div>
              <div class="form-group">
                <label for="numberOfPlaces">Nombre de places</label>
                <input
                  type="number"
                  id="numberOfPlaces"
                  [(ngModel)]="formData.numberOfPlaces"
                  name="numberOfPlaces"
                  min="0"
                  step="1"
                  placeholder="50"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Horaires d'exploitation</label>
              <div class="hours-24-toggle">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.is24h"
                    name="is24h"
                  />
                  <span>24h/24</span>
                </label>
              </div>
              @if (!formData.is24h) {
                <div class="time-range">
                  <div class="time-input">
                    <label for="hoursFrom">De</label>
                    <select id="hoursFrom" [(ngModel)]="formData.hoursFrom" name="hoursFrom" required>
                      @for (hour of hourOptions; track hour) {
                        <option [value]="hour">{{ hour }}</option>
                      }
                    </select>
                  </div>
                  <span class="time-separator">-</span>
                  <div class="time-input">
                    <label for="hoursTo">A</label>
                    <select id="hoursTo" [(ngModel)]="formData.hoursTo" name="hoursTo" required>
                      @for (hour of hourOptions; track hour) {
                        <option [value]="hour">{{ hour }}</option>
                      }
                    </select>
                  </div>
                </div>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="carSabot">Prix Sabot (TND)</label>
                <input
                  type="number"
                  id="carSabot"
                  [(ngModel)]="formData.carSabot"
                  name="carSabot"
                  required
                  min="0"
                  step="1"
                  placeholder="50"
                />
              </div>
              <div class="form-group">
                <label for="pound">Prix Fourriere (TND)</label>
                <input
                  type="number"
                  id="pound"
                  [(ngModel)]="formData.pound"
                  name="pound"
                  required
                  min="0"
                  step="1"
                  placeholder="100"
                />
              </div>
            </div>

            @if (formError) {
            <div class="form-error">{{ formError }}</div>
            }

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="closeModal()"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingZone"
              >
                {{ isSavingZone ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal) {
      <div class="modal-overlay" (click)="closeDeleteModal()">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Confirmer la suppression</h2>
            <button class="close-btn" (click)="closeDeleteModal()">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p>
              Etes-vous sur de vouloir supprimer la zone
              <strong>{{ zoneToDelete?.name }}</strong> ?
            </p>
            <p class="warning-text">
              Cette action est irreversible et supprimera toutes les donnees
              associees.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteModal()">
              Annuler
            </button>
            <button
              class="btn btn-danger"
              (click)="deleteZone()"
              [disabled]="isDeleting"
            >
              {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .zones-page {
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-xl);
      }

      .header-content h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }

      .header-content p {
        margin: var(--spacing-xs) 0 0;
        color: var(--app-text-secondary);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: 10px var(--spacing-md);
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: var(--color-secondary);
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
      }
      .btn-secondary {
        background: var(--app-surface);
        color: var(--app-text-primary);
        border: 1px solid var(--app-border);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--app-surface-variant);
      }
      .btn-success {
        background: var(--color-success);
        color: white;
      }
      .btn-warning {
        background: #f59e0b;
        color: white;
      }
      .btn-danger {
        background: var(--color-error);
        color: white;
      }
      .btn-danger-outline {
        background: transparent;
        color: var(--color-error);
        border: 1px solid var(--color-error);
      }
      .btn-danger-outline:hover:not(:disabled) {
        background: var(--color-error);
        color: white;
      }
      .btn-info {
        background: #0ea5e9;
        color: white;
      }
      .btn-info:hover:not(:disabled) {
        background: #0284c7;
      }
      .btn-sm {
        padding: 6px 12px;
        font-size: 0.813rem;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .loading,
      .error-state,
      .empty-state {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--app-text-secondary);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--app-border);
        border-top-color: var(--color-secondary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto var(--spacing-md);
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .zones-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: var(--spacing-lg);
      }

      .zone-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        transition: all 0.2s ease;
      }

      .zone-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .zone-card.inactive {
        opacity: 0.7;
      }

      .zone-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-md);
      }

      .zone-code-badge {
        padding: 8px 12px;
        background: var(--color-secondary);
        color: white;
        border-radius: var(--radius-sm);
        font-weight: 700;
        font-size: 0.875rem;
        letter-spacing: 0.5px;
      }

      .zone-code-badge.large {
        padding: 12px 16px;
        font-size: 1.25rem;
      }

      .zone-info {
        flex: 1;
      }
      .zone-info h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }
      .zone-description {
        margin: 4px 0 0;
        font-size: 0.813rem;
        color: var(--app-text-secondary);
      }

      .status-badge {
        padding: 4px 10px;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 600;
      }

      .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
      }
      .status-badge.inactive {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }

      .zone-details {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) 0;
        border-top: 1px solid var(--app-border);
        border-bottom: 1px solid var(--app-border);
      }

      .detail-row {
        display: flex;
        gap: var(--spacing-lg);
      }
      .detail-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .detail-item .label {
        font-size: 0.75rem;
        color: var(--app-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .detail-item .value {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--app-text-primary);
      }

      .zone-actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
        flex-wrap: wrap;
      }

      /* ========== Streets Editor Styles ========== */
      .editor-container {
        display: flex;
        height: calc(100vh - 112px);
        width: 100%;
        overflow: hidden;
        border-radius: var(--radius-md);
        border: 1px solid var(--app-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        margin: 0 -16px;
        width: calc(100% + 32px);
      }

      .sidebar {
        width: 320px;
        background: var(--app-surface);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        border-right: 1px solid var(--app-border);
      }

      .sidebar-header {
        padding: var(--spacing-md) var(--spacing-lg);
        background: var(--app-surface-variant);
        border-bottom: 1px solid var(--app-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .back-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: 8px 12px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        color: var(--app-text-primary);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .back-btn:hover {
        background: var(--app-surface);
        border-color: var(--color-secondary);
        color: var(--color-secondary);
      }

      .close-sidebar {
        display: none;
        width: 32px;
        height: 32px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        color: var(--app-text-secondary);
        font-size: 1.5rem;
        cursor: pointer;
        line-height: 1;
        align-items: center;
        justify-content: center;
      }

      .zone-summary {
        padding: var(--spacing-lg);
        text-align: center;
        border-bottom: 1px solid var(--app-border);
      }

      .zone-summary h2 {
        margin: var(--spacing-sm) 0 4px;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--app-text-primary);
      }

      .zone-summary p {
        margin: 0;
        font-size: 0.813rem;
        color: var(--app-text-secondary);
      }

      .section {
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: 1px solid var(--app-border);
      }

      .section label {
        display: block;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--app-text-secondary);
        margin-bottom: var(--spacing-sm);
        letter-spacing: 0.5px;
      }

      .street-types {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .type-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: transparent;
        border: 2px solid var(--app-border);
        border-radius: var(--radius-sm);
        color: var(--app-text-primary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .type-btn:hover {
        background: var(--app-surface-variant);
      }
      .type-btn.active {
        color: #fff;
        font-weight: 500;
      }

      .color-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(0, 0, 0, 0.2);
      }

      .boundary-controls {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .boundary-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
      }

      .boundary-status.has-boundary {
        background: rgba(34, 197, 94, 0.1);
        color: #059669;
      }

      .boundary-status.no-boundary {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
      }

      .hint {
        font-size: 0.75rem;
        color: var(--app-text-secondary);
        margin: 0;
        font-style: italic;
      }

      .hint.edit-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-sm);
        color: #0284c7;
        font-style: normal;
      }

      .boundary-actions {
        display: flex;
        gap: var(--spacing-sm);
      }

      .boundary-actions .btn {
        flex: 1;
      }

      .btn.full-width {
        width: 100%;
      }

      .stats {
        display: flex;
        gap: var(--spacing-md);
      }

      .stat {
        flex: 1;
        text-align: center;
        padding: 12px;
        background: var(--app-surface-variant);
        border-radius: var(--radius-sm);
      }

      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-secondary);
      }
      .stat-label {
        font-size: 0.75rem;
        color: var(--app-text-secondary);
      }

      .actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .instructions {
        flex: 1;
      }
      .instructions h3 {
        font-size: 0.875rem;
        margin: 0 0 12px;
        color: var(--app-text-primary);
      }
      .instructions ol {
        margin: 0;
        padding-left: 20px;
        font-size: 0.813rem;
        color: var(--app-text-secondary);
        line-height: 1.8;
      }

      .message {
        padding: 12px var(--spacing-lg);
        font-size: 0.875rem;
        text-align: center;
      }

      .message.success {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success);
      }
      .message.error {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error);
      }

      .map-container {
        flex: 1;
        position: relative;
      }

      #streets-map {
        width: 100%;
        height: 100%;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(248, 250, 252, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md);
        z-index: 1000;
      }

      .loading-overlay p {
        color: var(--app-text-primary);
        font-size: 0.875rem;
      }

      .sidebar-toggle {
        display: none;
        position: fixed;
        top: 80px;
        right: var(--spacing-md);
        z-index: 1001;
        width: 44px;
        height: 44px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .toggle-icon {
        display: block;
        width: 20px;
        height: 2px;
        background: var(--color-secondary);
        position: relative;
      }

      .toggle-icon::before,
      .toggle-icon::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 2px;
        background: var(--color-secondary);
        left: 0;
        transition: transform 0.2s ease;
      }

      .toggle-icon::before {
        top: -6px;
      }
      .toggle-icon::after {
        top: 6px;
      }

      .sidebar-toggle.open .toggle-icon {
        background: transparent;
      }
      .sidebar-toggle.open .toggle-icon::before {
        transform: rotate(45deg);
        top: 0;
      }
      .sidebar-toggle.open .toggle-icon::after {
        transform: rotate(-45deg);
        top: 0;
      }

      .sidebar-backdrop {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1050;
      }

      /* ========== Modal Styles ========== */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--spacing-md);
      }

      .modal {
        background: var(--app-surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 560px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-sm {
        max-width: 400px;
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
        line-height: 1;
      }

      .close-btn:hover {
        color: var(--app-text-primary);
      }

      .modal-body {
        padding: var(--spacing-lg);
      }
      .modal-body p {
        margin: 0 0 var(--spacing-md);
        color: var(--app-text-primary);
      }
      .warning-text {
        color: var(--color-error) !important;
        font-size: 0.875rem;
      }

      .form-row {
        display: flex;
        gap: var(--spacing-md);
      }
      .form-row .form-group {
        flex: 1;
      }
      .form-group {
        margin-bottom: var(--spacing-md);
      }
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--app-text-primary);
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 10px var(--spacing-md);
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        color: var(--app-text-primary);
        font-family: inherit;
      }

      .form-group textarea {
        resize: vertical;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .form-group input:disabled {
        background: var(--app-surface-variant);
        cursor: not-allowed;
      }

      .location-picker {
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }

      .picker-map {
        height: 200px;
        width: 100%;
        cursor: crosshair;
      }

      .location-info {
        padding: 8px var(--spacing-md);
        background: var(--app-surface-variant);
        border-top: 1px solid var(--app-border);
        font-size: 0.813rem;
      }

      .coords {
        font-family: monospace;
        color: var(--app-text-primary);
        font-weight: 500;
      }

      .coords-placeholder {
        color: var(--app-text-secondary);
        font-style: italic;
      }

      .time-range {
        display: flex;
        align-items: flex-end;
        gap: var(--spacing-md);
      }

      .time-input {
        flex: 1;
      }

      .time-input label {
        display: block;
        font-size: 0.75rem;
        color: var(--app-text-secondary);
        margin-bottom: 4px;
      }

      .time-input select {
        width: 100%;
        padding: 10px var(--spacing-md);
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        color: var(--app-text-primary);
        cursor: pointer;
      }

      .time-input select:focus {
        outline: none;
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .time-separator {
        font-size: 1.25rem;
        color: var(--app-text-secondary);
        padding-bottom: 10px;
      }

      .hours-24-toggle {
        margin-bottom: var(--spacing-sm);
      }

      .checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--app-text-primary);
      }

      .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--color-secondary);
      }

      .form-error {
        padding: 10px var(--spacing-md);
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: var(--radius-sm);
        color: var(--color-error);
        font-size: 0.875rem;
        margin-bottom: var(--spacing-md);
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--app-border);
        margin-top: var(--spacing-md);
      }

      /* ========== Responsive ========== */
      @media (max-width: 1024px) {
        .sidebar {
          width: 280px;
        }
        .instructions {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .zones-grid {
          grid-template-columns: 1fr;
        }
        .form-row {
          flex-direction: column;
          gap: 0;
        }
        .detail-row {
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .sidebar-backdrop {
          display: block;
        }
        .sidebar-toggle {
          display: flex;
        }
        .close-sidebar {
          display: flex;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 300px;
          max-width: 85vw;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 1100;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
        }

        .sidebar.open {
          transform: translateX(0);
        }
        .editor-container {
          margin: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class ZonesComponent implements OnInit, AfterViewInit, OnDestroy {
  // View state
  viewMode: ViewMode = 'list';

  // Zones list
  zones: Zone[] = [];
  isLoading = true;
  error = '';

  // Zone form
  showModal = false;
  editingZone: Zone | null = null;
  formData = this.getEmptyFormData();
  formError = '';
  isSavingZone = false;

  // Delete zone
  showDeleteModal = false;
  zoneToDelete: Zone | null = null;
  isDeleting = false;

  // Location picker
  private locationPickerMap: L.Map | null = null;
  private locationMarker: L.Marker | null = null;

  // Streets editor
  selectedZone: Zone | null = null;
  map!: L.Map;
  drawnItems!: L.FeatureGroup;
  boundaryLayer!: L.FeatureGroup;
  drawControl!: L.Control.Draw;
  selectedStreetType: StreetType = StreetType.PAYABLE;
  drawnStreets: DrawnStreet[] = [];
  existingStreets: Street[] = [];
  zoneBoundary: ZoneBoundary | null = null;
  isEditingBoundary = false;
  isLoadingStreets = false;
  isSaving = false;
  isSavingBoundary = false;
  sidebarOpen = false;
  mapMessage: { type: 'success' | 'error'; text: string } | null = null;
  private mapInitialized = false;

  readonly streetTypes = [
    { value: StreetType.PAYABLE, label: 'Payant', color: '#2196F3' },
    { value: StreetType.PROHIBITED, label: 'Interdit', color: '#F44336' },
  ];

  readonly hourOptions: string[] = Array.from({ length: 24 }, (_, i) =>
    `${i.toString().padStart(2, '0')}:00`
  );

  constructor(
    private zonesService: ZonesService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngAfterViewInit(): void {
    // Map will be initialized when opening streets editor
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  get canManageZones(): boolean {
    const role = this.authService.currentOperator?.role;
    return role === 'super_admin' || role === 'admin';
  }

  getEmptyFormData() {
    return {
      code: '',
      name: '',
      description: '',
      latitude: null as number | null,
      longitude: null as number | null,
      hourlyRate: null as number | null,
      is24h: false,
      hoursFrom: '08:00',
      hoursTo: '20:00',
      carSabot: null as number | null,
      pound: null as number | null,
      numberOfPlaces: null as number | null,
    };
  }

  // ==================== ZONES LIST ====================

  loadZones(): void {
    this.isLoading = true;
    this.error = '';

    this.zonesService.getAll().subscribe({
      next: (response) => {
        this.zones = response.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error =
          err.error?.message || 'Erreur lors du chargement des zones';
        this.isLoading = false;
      },
    });
  }

  openCreateModal(): void {
    this.editingZone = null;
    this.formData = this.getEmptyFormData();
    this.formError = '';
    this.showModal = true;
    setTimeout(() => this.initLocationPickerMap(), 100);
  }

  openEditModal(zone: Zone): void {
    this.editingZone = zone;

    // Check if 24h
    const is24h = this.is24hOperation(zone.operatingHours);
    const [hoursFrom, hoursTo] = this.parseOperatingHours(zone.operatingHours);

    this.formData = {
      code: zone.code,
      name: zone.name,
      description: zone.description || '',
      latitude: zone.location.coordinates[1],
      longitude: zone.location.coordinates[0],
      hourlyRate: zone.hourlyRate,
      is24h,
      hoursFrom,
      hoursTo,
      carSabot: zone.prices?.car_sabot || 0,
      pound: zone.prices?.pound || 0,
      numberOfPlaces: zone.numberOfPlaces || 0,
    };
    this.formError = '';
    this.showModal = true;
    setTimeout(() => this.initLocationPickerMap(), 100);
  }

  private is24hOperation(operatingHours: string): boolean {
    if (!operatingHours) return false;
    const normalized = operatingHours.toLowerCase().replace(/\s/g, '');
    return normalized === '24h' || normalized === '24h/24' || normalized === '00:00-00:00' || normalized === '00:00-24:00';
  }

  private parseOperatingHours(operatingHours: string): [string, string] {
    if (!operatingHours) return ['08:00', '20:00'];

    const parts = operatingHours.split('-').map(p => p.trim());
    const from = parts[0] || '08:00';
    const to = parts[1] || '20:00';

    // Normalize to HH:00 format
    const normalizeHour = (h: string) => {
      const match = h.match(/(\d{1,2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:00`;
      }
      return h;
    };

    return [normalizeHour(from), normalizeHour(to)];
  }

  closeModal(): void {
    this.destroyLocationPickerMap();
    this.showModal = false;
    this.editingZone = null;
    this.formError = '';
  }

  saveZone(): void {
    if (
      !this.formData.code ||
      !this.formData.name ||
      !this.formData.latitude ||
      !this.formData.longitude
    ) {
      this.formError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.formData.hourlyRate) {
      this.formError = 'Veuillez specifier le tarif horaire';
      return;
    }

    if (!this.formData.is24h && (!this.formData.hoursFrom || !this.formData.hoursTo)) {
      this.formError = 'Veuillez specifier les horaires';
      return;
    }

    this.isSavingZone = true;
    this.formError = '';

    const operatingHours = this.formData.is24h
      ? '24h/24'
      : `${this.formData.hoursFrom} - ${this.formData.hoursTo}`;

    const zoneData: CreateZoneDto = {
      code: this.formData.code,
      name: this.formData.name,
      coordinates: [this.formData.longitude, this.formData.latitude],
      hourlyRate: this.formData.hourlyRate,
      operatingHours,
      prices: {
        car_sabot: this.formData.carSabot || 0,
        pound: this.formData.pound || 0,
      },
      numberOfPlaces: this.formData.numberOfPlaces || 0,
      description: this.formData.description || undefined,
    };

    const request = this.editingZone
      ? this.zonesService.update(this.editingZone._id, zoneData)
      : this.zonesService.create(zoneData);

    request.subscribe({
      next: () => {
        this.isSavingZone = false;
        this.closeModal();
        this.loadZones();
      },
      error: (err) => {
        this.formError =
          err.error?.message || "Erreur lors de l'enregistrement";
        this.isSavingZone = false;
      },
    });
  }

  toggleStatus(zone: Zone): void {
    this.zonesService.update(zone._id, { isActive: !zone.isActive }).subscribe({
      next: () => this.loadZones(),
      error: (err) => {
        alert(err.error?.message || 'Erreur lors du changement de statut');
      },
    });
  }

  confirmDelete(zone: Zone): void {
    this.zoneToDelete = zone;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.zoneToDelete = null;
  }

  deleteZone(): void {
    if (!this.zoneToDelete) return;

    this.isDeleting = true;

    this.zonesService.delete(this.zoneToDelete._id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadZones();
      },
      error: (err) => {
        this.isDeleting = false;
        alert(err.error?.message || 'Erreur lors de la suppression');
      },
    });
  }

  // ==================== LOCATION PICKER ====================

  private initLocationPickerMap(): void {
    const mapElement = document.getElementById('location-picker-map');
    if (!mapElement || this.locationPickerMap) return;

    // Default center: Tunisia or existing coordinates
    const defaultLat = this.formData.latitude || 36.8065;
    const defaultLng = this.formData.longitude || 10.1815;
    const defaultZoom = this.formData.latitude ? 15 : 10;

    this.locationPickerMap = L.map('location-picker-map', {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
    }).addTo(this.locationPickerMap);

    // Add existing marker if editing
    if (this.formData.latitude && this.formData.longitude) {
      this.locationMarker = L.marker([this.formData.latitude, this.formData.longitude]).addTo(this.locationPickerMap);
    }

    // Handle click to set location
    this.locationPickerMap.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.formData.latitude = lat;
      this.formData.longitude = lng;

      // Update or create marker
      if (this.locationMarker) {
        this.locationMarker.setLatLng([lat, lng]);
      } else {
        this.locationMarker = L.marker([lat, lng]).addTo(this.locationPickerMap!);
      }
    });

    // Fix map size after modal animation
    setTimeout(() => {
      this.locationPickerMap?.invalidateSize();
    }, 200);
  }

  private destroyLocationPickerMap(): void {
    if (this.locationPickerMap) {
      this.locationPickerMap.remove();
      this.locationPickerMap = null;
      this.locationMarker = null;
    }
  }

  // ==================== STREETS EDITOR ====================

  openStreetsEditor(zone: Zone): void {
    this.selectedZone = zone;
    this.viewMode = 'streets';
    this.sidebarOpen = false;

    // Initialize map after view change
    setTimeout(() => {
      this.initMap();
      this.loadExistingStreets(zone._id);
    }, 100);
  }

  closeStreetsEditor(): void {
    this.destroyMap();
    this.selectedZone = null;
    this.viewMode = 'list';
    this.drawnStreets = [];
    this.existingStreets = [];
    this.zoneBoundary = null;
    this.isEditingBoundary = false;
  }

  private initMap(): void {
    if (this.mapInitialized || !this.selectedZone) return;

    const [lng, lat] = this.selectedZone.location.coordinates;

    this.map = L.map('streets-map', {
      center: [lat, lng],
      zoom: 16,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Boundary layer (underneath streets)
    this.boundaryLayer = new L.FeatureGroup();
    this.map.addLayer(this.boundaryLayer);

    // Streets layer (on top)
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    // Display existing boundary if any
    this.displayExistingBoundary();

    this.initDrawControl();
    this.setupDrawEvents();
    this.mapInitialized = true;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.mapInitialized = false;
    }
  }

  private initDrawControl(): void {
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#9333ea',
            weight: 3,
            opacity: 0.8,
            fillColor: '#9333ea',
            fillOpacity: 0.15,
          },
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: {
          shapeOptions: {
            color: this.getStreetColor(this.selectedStreetType),
            weight: 5,
            opacity: 0.8,
          },
        },
      },
    });
    this.map.addControl(this.drawControl);
  }

  private setupDrawEvents(): void {
    this.map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;

      if (event.layerType === 'polygon') {
        // Handle boundary polygon
        const polygon = event.layer as L.Polygon;

        // Remove existing boundary if any
        if (this.zoneBoundary) {
          this.boundaryLayer.removeLayer(this.zoneBoundary.layer);
        }

        polygon.setStyle({
          color: '#9333ea',
          weight: 3,
          opacity: 0.8,
          fillColor: '#9333ea',
          fillOpacity: 0.15,
        });

        this.boundaryLayer.addLayer(polygon);

        // Extract coordinates (convert to [lng, lat] format for storage)
        const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
        const coordinates = latLngs.map((ll) => [ll.lng, ll.lat]);

        this.zoneBoundary = {
          layer: polygon,
          coordinates,
        };

        this.showMapMessage('success', 'Limite de zone dessinee. Pensez a sauvegarder.');
      } else {
        // Handle street polyline
        const layer = event.layer as L.Polyline;

        layer.setStyle({
          color: this.getStreetColor(this.selectedStreetType),
          weight: 5,
          opacity: 0.8,
        });

        this.drawnItems.addLayer(layer);
        this.drawnStreets.push({
          layer,
          type: this.selectedStreetType,
        });
      }
    });

    this.map.on(L.Draw.Event.DELETED, (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Deleted;
      event.layers.eachLayer((layer) => {
        const index = this.drawnStreets.findIndex((s) => s.layer === layer);
        if (index !== -1) {
          this.drawnStreets.splice(index, 1);
        }
      });
    });
  }

  private getStreetColor(type: StreetType): string {
    const streetType = this.streetTypes.find((t) => t.value === type);
    return streetType?.color ?? '#FFFFFF';
  }

  private loadExistingStreets(zoneId: string): void {
    this.isLoadingStreets = true;
    this.apiService.getStreetsByZone(zoneId).subscribe({
      next: ({ data }) => {
        this.existingStreets = data;
        this.displayExistingStreets(data);
        this.isLoadingStreets = false;
      },
      error: (err) => {
        console.error('Error loading streets:', err);
        this.showMapMessage('error', 'Erreur lors du chargement des rues');
        this.isLoadingStreets = false;
      },
    });
  }

  private displayExistingStreets(streets: Street[]): void {
    for (const street of streets) {
      const points = decodePolyline(street.encodedPolyline);
      const polyline = L.polyline(points, {
        color: this.getStreetColor(street.type),
        weight: 5,
        opacity: 0.8,
      });

      this.drawnItems.addLayer(polyline);
      this.drawnStreets.push({
        layer: polyline,
        type: street.type,
        id: street._id,
      });
    }
  }

  onStreetTypeChange(): void {
    this.map.removeControl(this.drawControl);
    this.initDrawControl();
  }

  clearMap(): void {
    this.drawnItems.clearLayers();
    this.drawnStreets = [];
    this.existingStreets = [];
  }

  async saveStreets(): Promise<void> {
    if (!this.selectedZone) {
      this.showMapMessage('error', 'Aucune zone selectionnee');
      return;
    }

    const newStreets = this.drawnStreets.filter((s) => !s.id);
    if (newStreets.length === 0) {
      this.showMapMessage('error', 'Aucune nouvelle rue a sauvegarder');
      return;
    }

    this.isSaving = true;

    const streetsToCreate: CreateStreetDto[] = newStreets.map((street) => {
      const points = getPolylineLatLngs(street.layer);
      const encoded = encodePolyline(points);
      return {
        zoneId: this.selectedZone!._id,
        type: street.type,
        encodedPolyline: encoded,
        isActive: true,
      };
    });

    this.apiService.createStreetsBulk(streetsToCreate).subscribe({
      next: ({ data: savedStreets }) => {
        savedStreets.forEach((saved, i) => {
          newStreets[i].id = saved._id;
        });
        this.existingStreets.push(...savedStreets);
        this.showMapMessage(
          'success',
          `${savedStreets.length} rue(s) sauvegardee(s)`
        );
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving streets:', err);
        this.showMapMessage('error', 'Erreur lors de la sauvegarde');
        this.isSaving = false;
      },
    });
  }

  deleteAllStreets(): void {
    if (!this.selectedZone) return;

    if (
      !confirm(
        `Supprimer toutes les rues de la zone ${this.selectedZone.name}?`
      )
    ) {
      return;
    }

    this.isSaving = true;
    this.apiService.deleteStreetsByZone(this.selectedZone._id).subscribe({
      next: () => {
        this.clearMap();
        this.showMapMessage('success', 'Toutes les rues ont ete supprimees');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error deleting streets:', err);
        this.showMapMessage('error', 'Erreur lors de la suppression');
        this.isSaving = false;
      },
    });
  }

  private showMapMessage(type: 'success' | 'error', text: string): void {
    this.mapMessage = { type, text };
    setTimeout(() => {
      this.mapMessage = null;
    }, 3000);
  }

  getNewStreetsCount(): number {
    return this.drawnStreets.filter((s) => !s.id).length;
  }

  getExistingStreetsCount(): number {
    return this.drawnStreets.filter((s) => s.id).length;
  }

  // ==================== ZONE BOUNDARY ====================

  private displayExistingBoundary(): void {
    if (!this.selectedZone?.boundaries || this.selectedZone.boundaries.length === 0) {
      this.zoneBoundary = null;
      return;
    }

    // Convert [lng, lat] to [lat, lng] for Leaflet
    const latLngs = this.selectedZone.boundaries.map(
      (coord) => [coord[1], coord[0]] as [number, number]
    );

    const polygon = L.polygon(latLngs, {
      color: '#9333ea',
      weight: 3,
      opacity: 0.8,
      fillColor: '#9333ea',
      fillOpacity: 0.15,
    });

    this.boundaryLayer.addLayer(polygon);

    this.zoneBoundary = {
      layer: polygon,
      coordinates: this.selectedZone.boundaries,
    };
  }

  hasUnsavedBoundary(): boolean {
    if (!this.zoneBoundary || !this.selectedZone) return false;

    const existingBoundaries = this.selectedZone.boundaries || [];
    const currentCoordinates = this.zoneBoundary.coordinates;

    // Compare coordinates
    if (existingBoundaries.length !== currentCoordinates.length) return true;

    for (let i = 0; i < existingBoundaries.length; i++) {
      if (
        existingBoundaries[i][0] !== currentCoordinates[i][0] ||
        existingBoundaries[i][1] !== currentCoordinates[i][1]
      ) {
        return true;
      }
    }

    return false;
  }

  clearBoundary(): void {
    if (this.zoneBoundary) {
      this.boundaryLayer.removeLayer(this.zoneBoundary.layer);
      this.zoneBoundary = null;
    }
  }

  saveBoundary(): void {
    if (!this.selectedZone || !this.zoneBoundary) {
      this.showMapMessage('error', 'Aucune limite a sauvegarder');
      return;
    }

    this.isSavingBoundary = true;

    this.zonesService
      .update(this.selectedZone._id, {
        boundaries: this.zoneBoundary.coordinates,
      })
      .subscribe({
        next: () => {
          // Update local zone data
          this.selectedZone!.boundaries = this.zoneBoundary!.coordinates;

          // Update original coordinates since we just saved
          this.zoneBoundary!.originalCoordinates = [...this.zoneBoundary!.coordinates];

          // Also update in the zones list
          const zoneIndex = this.zones.findIndex(
            (z) => z._id === this.selectedZone!._id
          );
          if (zoneIndex !== -1) {
            this.zones[zoneIndex].boundaries = this.zoneBoundary!.coordinates;
          }

          this.showMapMessage('success', 'Limite de zone sauvegardee');
          this.isSavingBoundary = false;
        },
        error: (err) => {
          console.error('Error saving boundary:', err);
          this.showMapMessage('error', 'Erreur lors de la sauvegarde de la limite');
          this.isSavingBoundary = false;
        },
      });
  }

  // ==================== BOUNDARY EDITING ====================

  startEditingBoundary(): void {
    if (!this.zoneBoundary) return;

    // Store original coordinates for cancel operation
    this.zoneBoundary.originalCoordinates = [...this.zoneBoundary.coordinates];

    // Enable editing on the polygon layer
    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.enable();
    }

    // Update polygon style to show it's being edited
    this.zoneBoundary.layer.setStyle({
      color: '#f59e0b',
      weight: 4,
      opacity: 1,
      fillColor: '#f59e0b',
      fillOpacity: 0.2,
      dashArray: '5, 10',
    });

    this.isEditingBoundary = true;
    this.showMapMessage('success', 'Mode edition active - glissez les points');
  }

  finishEditingBoundary(): void {
    if (!this.zoneBoundary) return;

    // Disable editing
    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.disable();
    }

    // Extract updated coordinates from the polygon
    const latLngs = this.zoneBoundary.layer.getLatLngs()[0] as L.LatLng[];
    this.zoneBoundary.coordinates = latLngs.map((ll) => [ll.lng, ll.lat]);

    // Reset polygon style
    this.zoneBoundary.layer.setStyle({
      color: '#9333ea',
      weight: 3,
      opacity: 0.8,
      fillColor: '#9333ea',
      fillOpacity: 0.15,
      dashArray: '',
    });

    this.isEditingBoundary = false;
    this.showMapMessage('success', 'Modifications appliquees. Pensez a sauvegarder.');
  }

  cancelEditingBoundary(): void {
    if (!this.zoneBoundary || !this.zoneBoundary.originalCoordinates) return;

    // Disable editing
    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.disable();
    }

    // Restore original coordinates
    const originalLatLngs = this.zoneBoundary.originalCoordinates.map(
      (coord) => L.latLng(coord[1], coord[0])
    );
    this.zoneBoundary.layer.setLatLngs(originalLatLngs);
    this.zoneBoundary.coordinates = [...this.zoneBoundary.originalCoordinates];

    // Reset polygon style
    this.zoneBoundary.layer.setStyle({
      color: '#9333ea',
      weight: 3,
      opacity: 0.8,
      fillColor: '#9333ea',
      fillOpacity: 0.15,
      dashArray: '',
    });

    this.isEditingBoundary = false;
    this.showMapMessage('success', 'Modifications annulees');
  }
}
