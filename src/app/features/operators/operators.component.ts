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
  templateUrl: './operators.component.html',
  styleUrl: './operators.component.css'
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
