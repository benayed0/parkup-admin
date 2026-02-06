import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ApiService } from '../../../core/services/api.service';
import { ZonesService } from '../../../core/services/zones.service';
import { Zone } from '../../../core/models/zone.model';
import {
  Street,
  StreetType,
  CreateStreetDto,
} from '../../../core/models/street.model';
import {
  encodePolyline,
  decodePolyline,
} from '../../../core/utils/polyline.utils';

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
  originalCoordinates?: number[][];
}

@Component({
  selector: 'app-streets-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './streets-editor.component.html',
  styleUrl: './streets-editor.component.css',
})
export class StreetsEditorComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) zone!: Zone;
  @Output() closed = new EventEmitter<void>();
  @Output() boundaryUpdated = new EventEmitter<{ zoneId: string; boundaries: number[][] }>();

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
  private destroy$ = new Subject<void>();

  readonly streetTypes = [
    { value: StreetType.PAYABLE, label: 'Payant', color: '#2196F3' },
    { value: StreetType.PROHIBITED, label: 'Interdit', color: '#F44336' },
  ];

  constructor(
    private apiService: ApiService,
    private zonesService: ZonesService
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.loadExistingStreets(this.zone._id);
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
  }

  close(): void {
    this.closed.emit();
  }

  // ==================== MAP ====================

  private initMap(): void {
    if (this.mapInitialized) return;

    const [lng, lat] = this.zone.location.coordinates;

    this.map = L.map('streets-map', {
      center: [lat, lng],
      zoom: 16,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.boundaryLayer = new L.FeatureGroup();
    this.map.addLayer(this.boundaryLayer);

    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

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
        const polygon = event.layer as L.Polygon;

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

        const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
        const coordinates = latLngs.map((ll) => [ll.lng, ll.lat]);

        this.zoneBoundary = {
          layer: polygon,
          coordinates,
        };

        this.showMapMessage('success', 'Limite de zone dessinee. Pensez a sauvegarder.');
      } else {
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

  // ==================== STREETS ====================

  private loadExistingStreets(zoneId: string): void {
    this.isLoadingStreets = true;
    this.apiService.getStreetsByZone(zoneId).pipe(takeUntil(this.destroy$)).subscribe({
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
        zoneId: this.zone._id,
        type: street.type,
        encodedPolyline: encoded,
        isActive: true,
      };
    });

    this.apiService.createStreetsBulk(streetsToCreate).pipe(takeUntil(this.destroy$)).subscribe({
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
    if (
      !confirm(
        `Supprimer toutes les rues de la zone ${this.zone.name}?`
      )
    ) {
      return;
    }

    this.isSaving = true;
    this.apiService.deleteStreetsByZone(this.zone._id).pipe(takeUntil(this.destroy$)).subscribe({
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

  getNewStreetsCount(): number {
    return this.drawnStreets.filter((s) => !s.id).length;
  }

  getExistingStreetsCount(): number {
    return this.drawnStreets.filter((s) => s.id).length;
  }

  // ==================== ZONE BOUNDARY ====================

  private displayExistingBoundary(): void {
    if (!this.zone?.boundaries || this.zone.boundaries.length === 0) {
      this.zoneBoundary = null;
      return;
    }

    const latLngs = this.zone.boundaries.map(
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
      coordinates: this.zone.boundaries,
    };
  }

  hasUnsavedBoundary(): boolean {
    if (!this.zoneBoundary) return false;

    const existingBoundaries = this.zone.boundaries || [];
    const currentCoordinates = this.zoneBoundary.coordinates;

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
    if (!this.zoneBoundary) {
      this.showMapMessage('error', 'Aucune limite a sauvegarder');
      return;
    }

    this.isSavingBoundary = true;

    this.zonesService
      .update(this.zone._id, {
        boundaries: this.zoneBoundary.coordinates,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.zone.boundaries = this.zoneBoundary!.coordinates;
          this.zoneBoundary!.originalCoordinates = [...this.zoneBoundary!.coordinates];
          this.boundaryUpdated.emit({
            zoneId: this.zone._id,
            boundaries: this.zoneBoundary!.coordinates,
          });
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

    this.zoneBoundary.originalCoordinates = [...this.zoneBoundary.coordinates];

    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.enable();
    }

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

    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.disable();
    }

    const latLngs = this.zoneBoundary.layer.getLatLngs()[0] as L.LatLng[];
    this.zoneBoundary.coordinates = latLngs.map((ll) => [ll.lng, ll.lat]);

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

    const layer = this.zoneBoundary.layer as any;
    if (layer.editing) {
      layer.editing.disable();
    }

    const originalLatLngs = this.zoneBoundary.originalCoordinates.map(
      (coord) => L.latLng(coord[1], coord[0])
    );
    this.zoneBoundary.layer.setLatLngs(originalLatLngs);
    this.zoneBoundary.coordinates = [...this.zoneBoundary.originalCoordinates];

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

  private showMapMessage(type: 'success' | 'error', text: string): void {
    this.mapMessage = { type, text };
    setTimeout(() => {
      this.mapMessage = null;
    }, 3000);
  }
}
