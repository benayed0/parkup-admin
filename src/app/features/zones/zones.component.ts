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
  templateUrl: './zones.component.html',
  styleUrl: './zones.component.css',
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
