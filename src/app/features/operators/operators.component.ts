import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperatorsService, CreateOperatorDto } from '../../core/services/operators.service';
import { ZonesService } from '../../core/services/zones.service';
import { AuthService } from '../../core/services/auth.service';
import { Operator, OperatorRole, ROLE_LABELS, PopulatedZone } from '../../core/models/operator.model';
import { Zone } from '../../core/models/zone.model';

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="operators-page">
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Operateurs</h1>
          <p>Gerez les operateurs et leurs permissions</p>
        </div>
        @if (canManageOperators) {
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nouvel Operateur
          </button>
        }
      </div>

      @if (isLoading) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Chargement des operateurs...</p>
        </div>
      } @else if (error) {
        <div class="error-state">
          <p>{{ error }}</p>
          <button class="btn btn-secondary" (click)="loadOperators()">Reessayer</button>
        </div>
      } @else {
        <div class="operators-grid">
          @for (operator of operators; track operator._id) {
            <div class="operator-card" [class.inactive]="!operator.isActive">
              <div class="operator-header">
                <div class="operator-avatar">
                  {{ operator.name.charAt(0).toUpperCase() }}
                </div>
                <div class="operator-info">
                  <h3>{{ operator.name }}</h3>
                  <p>{{ operator.email }}</p>
                </div>
                <span class="role-badge" [attr.data-role]="operator.role">
                  {{ getRoleLabel(operator.role) }}
                </span>
              </div>

              <div class="operator-details">
                <div class="detail-item">
                  <span class="label">Statut</span>
                  <span class="status" [class.active]="operator.isActive" [class.inactive]="!operator.isActive">
                    {{ operator.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Zones</span>
                  <span class="value zones-list">
                    @if (operator.zoneIds && operator.zoneIds.length > 0) {
                      {{ getZoneNames(operator.zoneIds) }}
                    } @else {
                      <span class="no-zones">Aucune zone</span>
                    }
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Derniere connexion</span>
                  <span class="value">{{ operator.lastLoginAt ? formatDate(operator.lastLoginAt) : 'Jamais' }}</span>
                </div>
              </div>

              @if (canManageOperators && operator._id !== currentOperatorId) {
                <div class="operator-actions">
                  <button class="btn btn-sm btn-secondary" (click)="openEditModal(operator)">
                    Modifier
                  </button>
                  <button class="btn btn-sm btn-info" (click)="openZonesModal(operator)">
                    Zones
                  </button>
                  @if (operator.isActive) {
                    <button class="btn btn-sm btn-warning" (click)="toggleStatus(operator)">
                      Desactiver
                    </button>
                  } @else {
                    <button class="btn btn-sm btn-success" (click)="toggleStatus(operator)">
                      Activer
                    </button>
                  }
                  <button class="btn btn-sm btn-danger" (click)="confirmDelete(operator)">
                    Supprimer
                  </button>
                </div>
              }
            </div>
          } @empty {
            <div class="empty-state">
              <p>Aucun operateur trouve</p>
            </div>
          }
        </div>
      }

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingOperator ? 'Modifier l\\'Operateur' : 'Nouvel Operateur' }}</h2>
              <button class="close-btn" (click)="closeModal()">&times;</button>
            </div>
            <form (ngSubmit)="saveOperator()" class="modal-body">
              <div class="form-group">
                <label for="name">Nom</label>
                <input
                  type="text"
                  id="name"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  placeholder="Nom complet"
                />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  [(ngModel)]="formData.email"
                  name="email"
                  required
                  placeholder="email@example.com"
                  [disabled]="!!editingOperator"
                />
              </div>
              <div class="form-group">
                <label for="role">Role</label>
                <select id="role" [(ngModel)]="formData.role" name="role" required>
                  <option value="supervisor">Superviseur</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              @if (formError) {
                <div class="form-error">{{ formError }}</div>
              }

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                  {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Zones Modal -->
      @if (showZonesModal) {
        <div class="modal-overlay" (click)="closeZonesModal()">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Gerer les zones de {{ zonesOperator?.name }}</h2>
              <button class="close-btn" (click)="closeZonesModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p class="zones-description">Selectionnez les zones auxquelles cet operateur a acces:</p>

              @if (zonesLoading) {
                <div class="zones-loading">
                  <div class="spinner-small"></div>
                  Chargement des zones...
                </div>
              } @else if (zones.length === 0) {
                <div class="no-zones-available">
                  Aucune zone disponible. Creez d'abord des zones de stationnement.
                </div>
              } @else {
                <div class="zones-grid">
                  @for (zone of zones; track zone._id) {
                    <label class="zone-checkbox" [class.selected]="isZoneSelected(zone._id)">
                      <input
                        type="checkbox"
                        [checked]="isZoneSelected(zone._id)"
                        (change)="toggleZone(zone._id)"
                      />
                      <div class="zone-info">
                        <span class="zone-code">{{ zone.code }}</span>
                        <span class="zone-name">{{ zone.name }}</span>
                      </div>
                      <div class="zone-check">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </label>
                  }
                </div>

                <div class="zones-summary">
                  <span>{{ selectedZoneIds.length }} zone(s) selectionnee(s)</span>
                  @if (selectedZoneIds.length > 0) {
                    <button type="button" class="btn-link" (click)="clearAllZones()">Tout deselectionner</button>
                  }
                  @if (selectedZoneIds.length < zones.length) {
                    <button type="button" class="btn-link" (click)="selectAllZones()">Tout selectionner</button>
                  }
                </div>
              }

              @if (zonesError) {
                <div class="form-error">{{ zonesError }}</div>
              }

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeZonesModal()">
                  Annuler
                </button>
                <button type="button" class="btn btn-primary" (click)="saveZones()" [disabled]="zonesSaving">
                  {{ zonesSaving ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal) {
        <div class="modal-overlay" (click)="closeDeleteModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Confirmer la suppression</h2>
              <button class="close-btn" (click)="closeDeleteModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p>Etes-vous sur de vouloir supprimer l'operateur <strong>{{ operatorToDelete?.name }}</strong> ?</p>
              <p class="warning-text">Cette action est irreversible.</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDeleteModal()">Annuler</button>
              <button class="btn btn-danger" (click)="deleteOperator()" [disabled]="isDeleting">
                {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .operators-page {
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

    .btn-link {
      background: none;
      border: none;
      color: var(--color-secondary);
      font-size: 0.813rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .btn-link:hover {
      color: #1d4ed8;
    }

    .loading, .error-state, .empty-state {
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

    .spinner-small {
      width: 20px;
      height: 20px;
      border: 2px solid var(--app-border);
      border-top-color: var(--color-secondary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
      margin-right: var(--spacing-sm);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .operators-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--spacing-lg);
    }

    .operator-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: all 0.2s ease;
    }

    .operator-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .operator-card.inactive {
      opacity: 0.7;
    }

    .operator-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .operator-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-secondary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .operator-info {
      flex: 1;
    }

    .operator-info h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--app-text-primary);
    }

    .operator-info p {
      margin: 2px 0 0;
      font-size: 0.875rem;
      color: var(--app-text-secondary);
    }

    .role-badge {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge[data-role="super_admin"] {
      background: rgba(139, 92, 246, 0.1);
      color: #7c3aed;
    }

    .role-badge[data-role="admin"] {
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
    }

    .role-badge[data-role="manager"] {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .role-badge[data-role="supervisor"] {
      background: rgba(107, 114, 128, 0.1);
      color: #4b5563;
    }

    .operator-details {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) 0;
      border-top: 1px solid var(--app-border);
      border-bottom: 1px solid var(--app-border);
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .detail-item .label {
      color: var(--app-text-secondary);
      flex-shrink: 0;
    }

    .detail-item .value {
      color: var(--app-text-primary);
      text-align: right;
    }

    .zones-list {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .no-zones {
      color: var(--app-text-secondary);
      font-style: italic;
    }

    .status {
      font-weight: 500;
    }

    .status.active {
      color: var(--color-success);
    }

    .status.inactive {
      color: var(--color-error);
    }

    .operator-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
      flex-wrap: wrap;
    }

    /* Modal Styles */
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
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-sm {
      max-width: 400px;
    }

    .modal-lg {
      max-width: 600px;
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

    .zones-description {
      color: var(--app-text-secondary) !important;
      font-size: 0.875rem;
    }

    .zones-loading, .no-zones-available {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--app-text-secondary);
    }

    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .zone-checkbox {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--app-surface-variant);
      border: 2px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .zone-checkbox:hover {
      border-color: var(--app-border);
    }

    .zone-checkbox.selected {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--color-secondary);
    }

    .zone-checkbox input {
      display: none;
    }

    .zone-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .zone-code {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--app-text-primary);
    }

    .zone-name {
      font-size: 0.75rem;
      color: var(--app-text-secondary);
    }

    .zone-check {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--app-border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .zone-check svg {
      opacity: 0;
      color: white;
    }

    .zone-checkbox.selected .zone-check {
      background: var(--color-secondary);
    }

    .zone-checkbox.selected .zone-check svg {
      opacity: 1;
    }

    .zones-summary {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) 0;
      font-size: 0.875rem;
      color: var(--app-text-secondary);
      border-top: 1px solid var(--app-border);
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
    .form-group select {
      width: 100%;
      padding: 10px var(--spacing-md);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      color: var(--app-text-primary);
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-group input:disabled {
      background: var(--app-surface-variant);
      cursor: not-allowed;
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

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .operators-grid {
        grid-template-columns: 1fr;
      }

      .zones-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class OperatorsComponent implements OnInit {
  operators: Operator[] = [];
  zones: Zone[] = [];
  zonesMap: Map<string, Zone> = new Map();
  isLoading = true;
  error = '';

  showModal = false;
  editingOperator: Operator | null = null;
  formData: CreateOperatorDto = { email: '', name: '', role: 'supervisor' };
  formError = '';
  isSaving = false;

  showZonesModal = false;
  zonesOperator: Operator | null = null;
  selectedZoneIds: string[] = [];
  zonesLoading = false;
  zonesSaving = false;
  zonesError = '';

  showDeleteModal = false;
  operatorToDelete: Operator | null = null;
  isDeleting = false;

  currentOperatorId = '';
  canManageOperators = false;

  readonly roleLabels = ROLE_LABELS;

  constructor(
    private operatorsService: OperatorsService,
    private zonesService: ZonesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentOp = this.authService.currentOperator;
    if (currentOp) {
      this.currentOperatorId = currentOp._id;
      this.canManageOperators = currentOp.role === 'super_admin';
    }
    this.loadOperators();
    this.loadZones();
  }

  loadOperators(): void {
    this.isLoading = true;
    this.error = '';

    this.operatorsService.getAll().subscribe({
      next: (response) => {
        this.operators = response.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du chargement des operateurs';
        this.isLoading = false;
      },
    });
  }

  loadZones(): void {
    this.zonesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        this.zones = response.data;
        this.zonesMap = new Map(this.zones.map(z => [z._id, z]));
      },
      error: () => {
        // Silently fail, zones will just not be available
      },
    });
  }

  getRoleLabel(role: OperatorRole): string {
    return this.roleLabels[role] || role;
  }

  getZoneNames(zoneIds: (string | PopulatedZone)[]): string {
    if (!zoneIds || zoneIds.length === 0) return '';

    const names = zoneIds
      .map(zoneOrId => {
        // Check if it's a populated zone object
        if (typeof zoneOrId === 'object' && zoneOrId !== null && 'code' in zoneOrId) {
          return zoneOrId.code;
        }
        // Otherwise, it's a zone ID string - look up in map
        const zone = this.zonesMap.get(zoneOrId as string);
        return zone ? zone.code : null;
      })
      .filter(Boolean);

    return names.join(', ');
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  openCreateModal(): void {
    this.editingOperator = null;
    this.formData = { email: '', name: '', role: 'supervisor' };
    this.formError = '';
    this.showModal = true;
  }

  openEditModal(operator: Operator): void {
    this.editingOperator = operator;
    this.formData = {
      email: operator.email,
      name: operator.name,
      role: operator.role,
    };
    this.formError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingOperator = null;
    this.formError = '';
  }

  saveOperator(): void {
    if (!this.formData.name || !this.formData.email) {
      this.formError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    const request = this.editingOperator
      ? this.operatorsService.update(this.editingOperator._id, this.formData)
      : this.operatorsService.create(this.formData);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadOperators();
      },
      error: (err) => {
        this.formError = err.error?.message || 'Erreur lors de l\'enregistrement';
        this.isSaving = false;
      },
    });
  }

  // Zones Modal
  openZonesModal(operator: Operator): void {
    this.zonesOperator = operator;
    // Extract zone IDs from either populated zones or string IDs
    this.selectedZoneIds = (operator.zoneIds || []).map(zoneOrId => {
      if (typeof zoneOrId === 'object' && zoneOrId !== null && '_id' in zoneOrId) {
        return zoneOrId._id;
      }
      return zoneOrId as string;
    });
    this.zonesError = '';
    this.showZonesModal = true;
  }

  closeZonesModal(): void {
    this.showZonesModal = false;
    this.zonesOperator = null;
    this.selectedZoneIds = [];
    this.zonesError = '';
  }

  isZoneSelected(zoneId: string): boolean {
    return this.selectedZoneIds.includes(zoneId);
  }

  toggleZone(zoneId: string): void {
    const index = this.selectedZoneIds.indexOf(zoneId);
    if (index === -1) {
      this.selectedZoneIds.push(zoneId);
    } else {
      this.selectedZoneIds.splice(index, 1);
    }
  }

  selectAllZones(): void {
    this.selectedZoneIds = this.zones.map(z => z._id);
  }

  clearAllZones(): void {
    this.selectedZoneIds = [];
  }

  saveZones(): void {
    if (!this.zonesOperator) return;

    this.zonesSaving = true;
    this.zonesError = '';

    this.operatorsService.updateZones(this.zonesOperator._id, this.selectedZoneIds).subscribe({
      next: () => {
        this.zonesSaving = false;
        this.closeZonesModal();
        this.loadOperators();
      },
      error: (err) => {
        this.zonesError = err.error?.message || 'Erreur lors de la mise a jour des zones';
        this.zonesSaving = false;
      },
    });
  }

  toggleStatus(operator: Operator): void {
    const request = operator.isActive
      ? this.operatorsService.deactivate(operator._id)
      : this.operatorsService.activate(operator._id);

    request.subscribe({
      next: () => this.loadOperators(),
      error: (err) => {
        alert(err.error?.message || 'Erreur lors du changement de statut');
      },
    });
  }

  confirmDelete(operator: Operator): void {
    this.operatorToDelete = operator;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.operatorToDelete = null;
  }

  deleteOperator(): void {
    if (!this.operatorToDelete) return;

    this.isDeleting = true;

    this.operatorsService.delete(this.operatorToDelete._id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadOperators();
      },
      error: (err) => {
        this.isDeleting = false;
        alert(err.error?.message || 'Erreur lors de la suppression');
      },
    });
  }
}
