import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Agent } from '../../core/models/agent.model';
import { ZoneSelectorComponent } from '../../shared/components/zone-selector/zone-selector.component';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, ZoneSelectorComponent],
  template: `
    <div class="agents-page">
      <header class="page-header">
        <div>
          <h1>Agents</h1>
          <p>Gérer les agents de contrôle</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nouvel agent
        </button>
      </header>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Statut</label>
          <select [(ngModel)]="filterStatus" (change)="loadAgents()">
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div class="search-box">
          <input
            type="text"
            placeholder="Rechercher un agent..."
            [(ngModel)]="searchQuery"
            (input)="filterAgents()"
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
                <th>Nom</th>
                <th>Username</th>
                <th>Téléphone</th>
                <th>Zones</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (agent of filteredAgents; track agent._id) {
                <tr>
                  <td>{{ agent.name }}</td>
                  <td class="username">{{ agent.username }}</td>
                  <td>{{ agent.phone || '-' }}</td>
                  <td>
                    @if (agent.assignedZones && agent.assignedZones.length > 0) {
                      <span class="badge">{{ agent.assignedZones.length }} zones</span>
                    } @else {
                      <span class="text-muted">Aucune</span>
                    }
                  </td>
                  <td>
                    <span class="status" [class.active]="agent.isActive" [class.inactive]="!agent.isActive">
                      {{ agent.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="actions">
                    <button class="btn-icon" title="Modifier" (click)="openEditModal(agent)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button class="btn-icon danger" title="Supprimer" (click)="deleteAgent(agent)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty">Aucun agent trouvé</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>{{ filteredAgents.length }} agent(s) sur {{ agents.length }}</span>
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Nouvel agent</h2>
              <button class="close-btn" (click)="closeCreateModal()">&times;</button>
            </div>
            <form (ngSubmit)="createAgent()">
              <div class="form-group">
                <label>Nom complet *</label>
                <input type="text" [(ngModel)]="newAgent.name" name="name" required placeholder="Jean Dupont" />
              </div>
              <div class="form-group">
                <label>Username *</label>
                <input type="text" [(ngModel)]="newAgent.username" name="username" required placeholder="jean.dupont" />
              </div>
              <div class="form-group">
                <label>Mot de passe *</label>
                <div class="password-input-group">
                  <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="newAgent.password" name="password" required minlength="6" placeholder="Min. 6 caractères" />
                  <button type="button" class="btn-icon-sm" (click)="showPassword = !showPassword" title="Afficher/Masquer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      @if (showPassword) {
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      } @else {
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      }
                    </svg>
                  </button>
                  <button type="button" class="btn btn-sm btn-secondary" (click)="generatePassword()" title="Générer un mot de passe">
                    Générer
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input type="tel" [(ngModel)]="newAgent.phone" name="phone" placeholder="+212 6XX XXX XXX" />
              </div>
              <div class="form-group">
                <app-zone-selector
                  [(selectedZoneIds)]="newAgentZones"
                ></app-zone-selector>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Annuler</button>
                <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                  {{ isSaving ? 'Création...' : 'Créer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Edit Modal -->
      @if (showEditModal && editAgent) {
        <div class="modal-overlay" (click)="closeEditModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Modifier l'agent</h2>
              <button class="close-btn" (click)="closeEditModal()">&times;</button>
            </div>
            <form (ngSubmit)="updateAgent()">
              <div class="form-group">
                <label>Nom complet *</label>
                <input type="text" [(ngModel)]="editAgent.name" name="editName" required placeholder="Jean Dupont" />
              </div>
              <div class="form-group">
                <label>Username *</label>
                <input type="text" [(ngModel)]="editAgent.username" name="editUsername" required placeholder="jean.dupont" />
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input type="tel" [(ngModel)]="editAgent.phone" name="editPhone" placeholder="+212 6XX XXX XXX" />
              </div>
              <div class="form-group">
                <label>Nouveau mot de passe</label>
                <div class="password-input-group">
                  <input [type]="showEditPassword ? 'text' : 'password'" [(ngModel)]="editPassword" name="editPassword" minlength="6" placeholder="Laisser vide pour ne pas changer" />
                  <button type="button" class="btn-icon-sm" (click)="showEditPassword = !showEditPassword" title="Afficher/Masquer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      @if (showEditPassword) {
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      } @else {
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      }
                    </svg>
                  </button>
                  <button type="button" class="btn btn-sm btn-secondary" (click)="generateEditPassword()" title="Générer un mot de passe">
                    Générer
                  </button>
                </div>
              </div>
              <div class="form-group">
                <app-zone-selector
                  [(selectedZoneIds)]="editAgentZones"
                ></app-zone-selector>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editAgent.isActive" name="editIsActive" />
                  Agent actif
                </label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Annuler</button>
                <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                  {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
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
    .agents-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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
      color: var(--color-text-on-primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--app-surface-variant);
      color: var(--app-text-primary);
      border: 1px solid var(--app-border);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .filters {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
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
    }

    .filter-group select:focus,
    .search-box input:focus {
      outline: none;
      border-color: var(--color-secondary);
    }

    .search-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .search-box input {
      width: 100%;
      max-width: 300px;
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
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
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

    .code {
      font-family: monospace;
      color: var(--color-secondary);
    }

    .username {
      color: var(--app-text-secondary);
    }

    .badge {
      background: rgba(37, 99, 235, 0.1);
      color: var(--color-secondary);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }

    .text-muted {
      color: var(--app-text-secondary);
    }

    .status {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status.active {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    .status.inactive {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
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
      border: 1px solid var(--app-border);
      border-radius: var(--radius-md);
      width: 100%;
      max-width: 440px;
      margin: var(--spacing-md);
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
      color: var(--app-text-primary);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--app-text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
    }

    .close-btn:hover {
      background: var(--app-surface-variant);
      color: var(--app-text-primary);
    }

    .modal form {
      padding: var(--spacing-lg);
    }

    .form-group {
      margin-bottom: var(--spacing-md);
    }

    .form-group label {
      display: block;
      font-size: 0.813rem;
      color: var(--app-text-secondary);
      margin-bottom: 6px;
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

    .password-input-group {
      display: flex;
      gap: 8px;
    }

    .password-input-group input {
      flex: 1;
    }

    .btn-icon-sm {
      width: 36px;
      height: 36px;
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      background: var(--app-surface);
      color: var(--app-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .btn-icon-sm:hover {
      background: var(--app-surface-variant);
      color: var(--app-text-primary);
    }

    .btn-sm {
      padding: 8px 12px;
      font-size: 0.813rem;
      flex-shrink: 0;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--app-text-primary);
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: var(--spacing-xl);
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
      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .filters {
        flex-direction: column;
      }

      .search-box input {
        max-width: none;
      }

      .table-container {
        overflow-x: auto;
      }

      .data-table {
        min-width: 700px;
      }
    }
  `]
})
export class AgentsComponent implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  isLoading = true;
  isSaving = false;

  filterStatus = 'all';
  searchQuery = '';

  showCreateModal = false;
  showPassword = false;
  newAgent = {
    name: '',
    username: '',
    password: '',
    phone: '',
  };
  newAgentZones: string[] = [];

  showEditModal = false;
  showEditPassword = false;
  editAgent: { _id: string; name: string; username: string; phone: string; isActive: boolean } | null = null;
  editPassword = '';
  editAgentZones: string[] = [];

  message: { type: 'success' | 'error'; text: string } | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.isLoading = true;
    const params: any = {};

    if (this.filterStatus === 'active') {
      params.isActive = true;
    } else if (this.filterStatus === 'inactive') {
      params.isActive = false;
    }

    this.apiService.getAgents(params).subscribe({
      next: ({ data }) => {
        this.agents = data;
        this.filterAgents();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        this.showMessage('error', 'Erreur lors du chargement des agents');
        this.isLoading = false;
      },
    });
  }

  filterAgents(): void {
    if (!this.searchQuery.trim()) {
      this.filteredAgents = this.agents;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredAgents = this.agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.username.toLowerCase().includes(query) ||
        (agent.phone && agent.phone.toLowerCase().includes(query))
    );
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.showPassword = false;
    this.newAgent = {
      name: '',
      username: '',
      password: '',
      phone: '',
    };
    this.newAgentZones = [];
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createAgent(): void {
    if (!this.newAgent.name || !this.newAgent.username || !this.newAgent.password) {
      this.showMessage('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (this.newAgent.password.length < 6) {
      this.showMessage('error', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.isSaving = true;
    const createData = {
      ...this.newAgent,
      assignedZones: this.newAgentZones.length > 0 ? this.newAgentZones : undefined,
    };
    this.apiService.createAgent(createData).subscribe({
      next: ({ data }) => {
        this.agents.unshift(data);
        this.filterAgents();
        this.closeCreateModal();
        this.showMessage('success', 'Agent créé avec succès');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error creating agent:', err);
        this.showMessage('error', err.error?.message || 'Erreur lors de la création');
        this.isSaving = false;
      },
    });
  }

  openEditModal(agent: Agent): void {
    this.editAgent = {
      _id: agent._id,
      name: agent.name,
      username: agent.username,
      phone: agent.phone || '',
      isActive: agent.isActive,
    };
    // Extract zone IDs from populated zones
    this.editAgentZones = agent.assignedZones?.map(z =>
      typeof z === 'string' ? z : z._id
    ) || [];
    this.editPassword = '';
    this.showEditPassword = false;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editAgent = null;
    this.editPassword = '';
    this.editAgentZones = [];
  }

  updateAgent(): void {
    if (!this.editAgent || !this.editAgent.name || !this.editAgent.username) {
      this.showMessage('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (this.editPassword && this.editPassword.length < 6) {
      this.showMessage('error', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.isSaving = true;
    const updateData: any = {
      name: this.editAgent.name,
      username: this.editAgent.username,
      phone: this.editAgent.phone || undefined,
      isActive: this.editAgent.isActive,
      assignedZones: this.editAgentZones,
    };

    // First update the agent info
    this.apiService.updateAgent(this.editAgent._id, updateData).subscribe({
      next: ({ data }) => {
        // If password was provided, reset it
        if (this.editPassword) {
          this.apiService.resetAgentPassword(this.editAgent!._id, this.editPassword).subscribe({
            next: () => {
              this.updateAgentInList(data);
              this.closeEditModal();
              this.showMessage('success', 'Agent modifié avec succès');
              this.isSaving = false;
            },
            error: (err) => {
              console.error('Error resetting password:', err);
              this.updateAgentInList(data);
              this.closeEditModal();
              this.showMessage('error', 'Agent modifié mais erreur lors du changement de mot de passe');
              this.isSaving = false;
            },
          });
        } else {
          this.updateAgentInList(data);
          this.closeEditModal();
          this.showMessage('success', 'Agent modifié avec succès');
          this.isSaving = false;
        }
      },
      error: (err) => {
        console.error('Error updating agent:', err);
        this.showMessage('error', err.error?.message || 'Erreur lors de la modification');
        this.isSaving = false;
      },
    });
  }

  private updateAgentInList(updatedAgent: Agent): void {
    const index = this.agents.findIndex((a) => a._id === updatedAgent._id);
    if (index !== -1) {
      this.agents[index] = updatedAgent;
      this.filterAgents();
    }
  }

  generateEditPassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.editPassword = password;
    this.showEditPassword = true;
  }

  deleteAgent(agent: Agent): void {
    if (!confirm(`Supprimer l'agent ${agent.name} ?`)) {
      return;
    }

    this.apiService.deleteAgent(agent._id).subscribe({
      next: () => {
        this.agents = this.agents.filter((a) => a._id !== agent._id);
        this.filterAgents();
        this.showMessage('success', 'Agent supprimé');
      },
      error: (err) => {
        console.error('Error deleting agent:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
      },
    });
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newAgent.password = password;
    this.showPassword = true;
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
