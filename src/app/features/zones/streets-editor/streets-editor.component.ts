import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
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
import { environment } from '../../../../environments/environment';

interface DrawnStreet {
  encodedPolyline: string;
  leftType: StreetType;
  rightType: StreetType;
  name?: string;
  id?: string; // set after saving to backend
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
  @Output() boundaryUpdated = new EventEmitter<{
    zoneId: string;
    boundaries: number[][];
  }>();

  map!: mapboxgl.Map;
  draw!: MapboxDraw;

  selectedLeftType: StreetType = StreetType.PAYABLE;
  selectedRightType: StreetType = StreetType.PAYABLE;
  sameTypeBothSides = true;
  newStreetName = '';
  drawnStreets: DrawnStreet[] = [];
  existingStreets: Street[] = [];
  isLoadingStreets = false;
  isSaving = false;
  sidebarOpen = false;
  mapMessage: { type: 'success' | 'error'; text: string } | null = null;

  private mapInitialized = false;
  private destroy$ = new Subject<void>();

  readonly streetTypes = [
    { value: StreetType.FREE, label: 'Gratuit', color: '#16A34A' },
    { value: StreetType.PAYABLE, label: 'Payant', color: '#2563EB' },
    { value: StreetType.PROHIBITED, label: 'Interdit', color: '#DC2626' },
  ];

  constructor(
    private apiService: ApiService,
    private zonesService: ZonesService,
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
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

    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      accessToken: environment.mapboxToken,
      center: [lng, lat],
      zoom: 16,
    });

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { line_string: true, trash: true },
    });

    this.map.addControl(this.draw);

    this.map.on('load', () => {
      this._initLayers();
      this._displayZoneBoundary();
      this.loadExistingStreets(this.zone._id);
    });

    this.setupDrawEvents();
    this.mapInitialized = true;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.mapInitialized = false;
    }
  }

  private _initLayers(): void {
    // Zone boundary source & layers
    this.map.addSource('zone-boundary', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'zone-fill',
      type: 'fill',
      source: 'zone-boundary',
      paint: { 'fill-color': '#2563EB', 'fill-opacity': 0.08 },
    }, 'road-label');
    this.map.addLayer({
      id: 'zone-stroke',
      type: 'line',
      source: 'zone-boundary',
      paint: { 'line-color': '#2563EB', 'line-width': 2 },
    }, 'road-label');

    // Streets preview source & layers
    this.map.addSource('streets-preview', {
      type: 'geojson',
      data: this._emptyFeatureCollection(),
    });

    // Left side: offset +4 (left of travel direction)
    this.map.addLayer({
      id: 'streets-left',
      type: 'line',
      source: 'streets-preview',
      paint: {
        'line-color': [
          'match',
          ['get', 'leftType'],
          'FREE', '#16A34A',
          'PAYABLE', '#2563EB',
          'PROHIBITED', '#DC2626',
          '#888888',
        ],
        'line-width': 5,
        'line-offset': 4,
        'line-opacity': 0.85,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    }, 'road-label');

    // Right side: offset -4 (right of travel direction)
    this.map.addLayer({
      id: 'streets-right',
      type: 'line',
      source: 'streets-preview',
      paint: {
        'line-color': [
          'match',
          ['get', 'rightType'],
          'FREE', '#16A34A',
          'PAYABLE', '#2563EB',
          'PROHIBITED', '#DC2626',
          '#888888',
        ],
        'line-width': 5,
        'line-offset': -4,
        'line-opacity': 0.85,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    }, 'road-label');
  }

  private _displayZoneBoundary(): void {
    if (!this.zone?.boundaries || this.zone.boundaries.length === 0) return;

    const source = this.map.getSource(
      'zone-boundary',
    ) as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [this.zone.boundaries],
      },
    } as GeoJSON.Feature);
  }

  private _updateStreetPreviewLayers(): void {
    const features = this.drawnStreets.map((s) => ({
      type: 'Feature' as const,
      properties: {
        leftType: s.leftType,
        rightType: s.rightType,
        name: s.name ?? null,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: decodePolyline(s.encodedPolyline).map((p) => [p.lng, p.lat]),
      },
    }));

    const source = this.map.getSource(
      'streets-preview',
    ) as mapboxgl.GeoJSONSource;
    source.setData({ type: 'FeatureCollection', features });
  }

  private _emptyFeatureCollection(): GeoJSON.FeatureCollection {
    return { type: 'FeatureCollection', features: [] };
  }

  private setupDrawEvents(): void {
    this.map.on('draw.create', async (e: any) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'LineString') return;

      const coords: [number, number][] = feature.geometry.coordinates;
      const encodedPolyline = encodePolyline(
        coords.map((c) => ({ lat: c[1], lng: c[0] })),
      );

      // Remove the rough drawn line — replaced by snapped GeoJSON layer
      this.draw.delete(feature.id);

      // Call backend to get road-snapped geometry
      let finalEncoded = encodedPolyline;
      try {
        const preview = await firstValueFrom(
          this.apiService.matchPreview(encodedPolyline),
        );
        if (preview?.matchedEncodedPolyline) {
          finalEncoded = preview.matchedEncodedPolyline;
        }
      } catch {
        // Fall back to original drawn polyline
      }

      const rightType = this.sameTypeBothSides
        ? this.selectedLeftType
        : this.selectedRightType;

      this.drawnStreets.push({
        encodedPolyline: finalEncoded,
        leftType: this.selectedLeftType,
        rightType,
        name: this.newStreetName.trim() || undefined,
      });

      this._updateStreetPreviewLayers();
    });
  }

  getStreetColor(type: StreetType): string {
    return this.streetTypes.find((t) => t.value === type)?.color ?? '#FFFFFF';
  }

  // ==================== STREETS ====================

  private loadExistingStreets(zoneId: string): void {
    this.isLoadingStreets = true;
    this.apiService
      .getStreetsByZone(zoneId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ data }) => {
          this.existingStreets = data;
          this._displayExistingStreets(data);
          this.isLoadingStreets = false;
        },
        error: (err) => {
          console.error('Error loading streets:', err);
          this.showMapMessage('error', 'Erreur lors du chargement des rues');
          this.isLoadingStreets = false;
        },
      });
  }

  private _displayExistingStreets(streets: Street[]): void {
    for (const street of streets) {
      // Prefer road-matched geometry when available
      const renderPolyline =
        street.matchedEncodedPolyline ?? street.encodedPolyline;
      this.drawnStreets.push({
        encodedPolyline: renderPolyline,
        leftType: street.leftType,
        rightType: street.rightType,
        name: street.name,
        id: street._id,
      });
    }
    this._updateStreetPreviewLayers();
  }

  selectLeftType(type: StreetType): void {
    this.selectedLeftType = type;
    if (this.sameTypeBothSides) {
      this.selectedRightType = type;
    }
  }

  selectRightType(type: StreetType): void {
    this.selectedRightType = type;
  }

  onSameTypeBothSidesChange(): void {
    if (this.sameTypeBothSides) {
      this.selectedRightType = this.selectedLeftType;
    }
  }

  clearMap(): void {
    this.drawnStreets = [];
    this.existingStreets = [];
    this._updateStreetPreviewLayers();
  }

  async saveStreets(): Promise<void> {
    const newStreets = this.drawnStreets.filter((s) => !s.id);
    if (newStreets.length === 0) {
      this.showMapMessage('error', 'Aucune nouvelle rue a sauvegarder');
      return;
    }

    this.isSaving = true;

    const streetsToCreate: CreateStreetDto[] = newStreets.map((street) => ({
      zoneId: this.zone._id,
      leftType: street.leftType,
      rightType: street.rightType,
      name: street.name,
      encodedPolyline: street.encodedPolyline,
      isActive: true,
    }));

    this.apiService
      .createStreetsBulk(streetsToCreate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ data: savedStreets }) => {
          savedStreets.forEach((saved, i) => {
            newStreets[i].id = saved._id;
          });
          this.existingStreets.push(...savedStreets);
          this.showMapMessage(
            'success',
            `${savedStreets.length} rue(s) sauvegardee(s)`,
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
    if (!confirm(`Supprimer toutes les rues de la zone ${this.zone.name}?`)) {
      return;
    }

    this.isSaving = true;
    this.apiService
      .deleteStreetsByZone(this.zone._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    return this.drawnStreets.filter((s) => !!s.id).length;
  }

  hasBoundary(): boolean {
    return !!(this.zone?.boundaries && this.zone.boundaries.length > 0);
  }

  private showMapMessage(type: 'success' | 'error', text: string): void {
    this.mapMessage = { type, text };
    setTimeout(() => {
      this.mapMessage = null;
    }, 3000);
  }
}
