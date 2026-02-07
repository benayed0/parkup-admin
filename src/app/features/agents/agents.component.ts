import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { Agent } from '../../core/models/agent.model';
import { ZoneSelectorComponent } from '../../shared/components/zone-selector/zone-selector.component';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, ZoneSelectorComponent, PhoneInputComponent],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.css'
})
export class AgentsComponent implements OnInit, OnDestroy {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  isLoading = true;
  isSaving = false;
  private destroy$ = new Subject<void>();

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

  private allAgents: Agent[] = [];
  totalAgentsCount = 0;

  constructor(
    private apiService: ApiService,
    private dataStore: DataStoreService
  ) {}

  ngOnInit(): void {
    this.dataStore.loadAgents();
    this.dataStore.agents$.pipe(takeUntil(this.destroy$)).subscribe((agents) => {
      this.allAgents = agents;
      this.totalAgentsCount = agents.length;
      this.filterAgents();
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterAgents(): void {
    let result = this.allAgents;

    // Apply status filter
    if (this.filterStatus === 'active') {
      result = result.filter((a) => a.isActive);
    } else if (this.filterStatus === 'inactive') {
      result = result.filter((a) => !a.isActive);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.username.toLowerCase().includes(query) ||
          (agent.phone && agent.phone.toLowerCase().includes(query))
      );
    }

    this.agents = result;
    this.filteredAgents = result;
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
    this.apiService.createAgent(createData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.dataStore.refreshAgents();
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
    this.apiService.updateAgent(this.editAgent._id, updateData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        // If password was provided, reset it
        if (this.editPassword) {
          this.apiService.resetAgentPassword(this.editAgent!._id, this.editPassword).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.dataStore.refreshAgents();
              this.closeEditModal();
              this.showMessage('success', 'Agent modifié avec succès');
              this.isSaving = false;
            },
            error: (err) => {
              console.error('Error resetting password:', err);
              this.dataStore.refreshAgents();
              this.closeEditModal();
              this.showMessage('error', 'Agent modifié mais erreur lors du changement de mot de passe');
              this.isSaving = false;
            },
          });
        } else {
          this.dataStore.refreshAgents();
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

    this.apiService.deleteAgent(agent._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.dataStore.refreshAgents();
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
