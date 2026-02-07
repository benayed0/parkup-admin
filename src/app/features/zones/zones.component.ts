import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import * as L from 'leaflet';

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
import { AuthService } from '../../core/services/auth.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { Zone } from '../../core/models/zone.model';
import { ZoneFormModalComponent } from './zone-form-modal/zone-form-modal.component';
import { StreetsEditorComponent } from './streets-editor/streets-editor.component';

type ViewMode = 'list' | 'streets';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [CommonModule, ZoneFormModalComponent, StreetsEditorComponent],
  templateUrl: './zones.component.html',
  styleUrl: './zones.component.css',
})
export class ZonesComponent implements OnInit, OnDestroy {
  viewMode: ViewMode = 'list';

  zones: Zone[] = [];
  isLoading = true;
  error = '';

  showModal = false;
  editingZone: Zone | null = null;

  showDeleteModal = false;
  zoneToDelete: Zone | null = null;
  isDeleting = false;

  selectedZone: Zone | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private zonesService: ZonesService,
    private authService: AuthService,
    private dataStore: DataStoreService
  ) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canManageZones(): boolean {
    const role = this.authService.currentOperator?.role;
    return role === 'super_admin' || role === 'admin';
  }

  // ==================== ZONES LIST ====================

  loadZones(): void {
    this.isLoading = true;
    this.error = '';

    this.zonesService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
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

  // ==================== ZONE FORM MODAL ====================

  openCreateModal(): void {
    this.editingZone = null;
    this.showModal = true;
  }

  openEditModal(zone: Zone): void {
    this.editingZone = zone;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingZone = null;
  }

  onZoneSaved(): void {
    this.closeModal();
    this.loadZones();
    this.dataStore.refreshZones();
  }

  // ==================== STREETS EDITOR ====================

  openStreetsEditor(zone: Zone): void {
    this.selectedZone = zone;
    this.viewMode = 'streets';
  }

  onStreetsEditorClosed(): void {
    this.selectedZone = null;
    this.viewMode = 'list';
  }

  onBoundaryUpdated(event: { zoneId: string; boundaries: number[][] }): void {
    const zoneIndex = this.zones.findIndex((z) => z._id === event.zoneId);
    if (zoneIndex !== -1) {
      this.zones[zoneIndex].boundaries = event.boundaries;
    }
  }

  // ==================== ZONE ACTIONS ====================

  toggleStatus(zone: Zone): void {
    this.zonesService.update(zone._id, { isActive: !zone.isActive })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadZones();
          this.dataStore.refreshZones();
        },
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

    this.zonesService.delete(this.zoneToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.closeDeleteModal();
          this.loadZones();
          this.dataStore.refreshZones();
        },
        error: (err) => {
          this.isDeleting = false;
          alert(err.error?.message || 'Erreur lors de la suppression');
        },
      });
  }
}
