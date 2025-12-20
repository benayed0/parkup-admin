import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ApiService } from '../../core/services/api.service';
import { ParkingZone } from '../../core/models/parking-zone.model';
import {
  Street,
  StreetType,
  CreateStreetDto,
} from '../../core/models/street.model';
import {
  encodePolyline,
  decodePolyline,
} from '../../core/utils/polyline.utils';

/**
 * Extracts flat array of LatLng from polyline.
 * getLatLngs() can return nested arrays for multi-polylines.
 */
function getPolylineLatLngs(polyline: L.Polyline): L.LatLng[] {
  const latLngs = polyline.getLatLngs();
  // If it's a simple polyline, latLngs is LatLng[]
  // If nested, we need to flatten
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

@Component({
  selector: 'app-streets-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './streets-editor.component.html',
  styleUrl: './streets-editor.component.css',
})
export class StreetsEditorComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  map!: L.Map;
  drawnItems!: L.FeatureGroup;
  drawControl!: L.Control.Draw;

  zones: ParkingZone[] = [];
  selectedZone: ParkingZone | null = null;
  selectedStreetType: StreetType = StreetType.PAYABLE;
  drawnStreets: DrawnStreet[] = [];
  existingStreets: Street[] = [];

  isLoading = false;
  isSaving = false;
  sidebarOpen = false;
  message: { type: 'success' | 'error'; text: string } | null = null;

  readonly streetTypes = [
    { value: StreetType.PAYABLE, label: 'Payant', color: '#2196F3' },
    { value: StreetType.PROHIBITED, label: 'Interdit', color: '#F44336' },
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Default to Casablanca center
    this.map = L.map('map', {
      center: [33.5731, -7.5898],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    this.initDrawControl();
    this.setupDrawEvents();
  }

  private initDrawControl(): void {
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
      draw: {
        polygon: false,
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

  loadZones(): void {
    this.isLoading = true;
    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => {
        this.zones = data.filter((z) => z.isActive);
        this.isLoading = false;

        // Auto-select if only one zone available
        if (this.zones.length === 1) {
          this.onZoneSelected(this.zones[0]._id);
        }
      },
      error: (err) => {
        console.error('Error loading zones:', err);
        this.showMessage('error', 'Erreur lors du chargement des zones');
        this.isLoading = false;
      },
    });
  }

  onZoneSelected(zoneId: string): void {
    const zone = this.zones.find((z) => z._id === zoneId);
    if (!zone) return;

    this.selectedZone = zone;
    this.clearMap();

    // Center map on zone
    const [lng, lat] = zone.location.coordinates;
    this.map.setView([lat, lng], 16);

    // Load existing streets
    this.loadExistingStreets(zoneId);
  }

  private loadExistingStreets(zoneId: string): void {
    this.isLoading = true;
    this.apiService.getStreetsByZone(zoneId).subscribe({
      next: ({ data }) => {
        this.existingStreets = data;
        this.displayExistingStreets(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading streets:', err);
        this.showMessage('error', 'Erreur lors du chargement des rues');
        this.isLoading = false;
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
    // Update draw control with new color
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
      this.showMessage('error', 'Veuillez sélectionner une zone');
      return;
    }

    const newStreets = this.drawnStreets.filter((s) => !s.id);
    if (newStreets.length === 0) {
      this.showMessage('error', 'Aucune nouvelle rue à sauvegarder');
      return;
    }

    this.isSaving = true;

    const streetsToCreate: CreateStreetDto[] = newStreets.map((street) => {
      const points = getPolylineLatLngs(street.layer);
      console.log('Saving street with points:', points.map(p => ({ lat: p.lat, lng: p.lng })));
      const encoded = encodePolyline(points);
      console.log('Encoded polyline:', encoded);
      return {
        zoneId: this.selectedZone!._id,
        type: street.type,
        encodedPolyline: encoded,
        isActive: true,
      };
    });

    this.apiService.createStreetsBulk(streetsToCreate).subscribe({
      next: ({ data: savedStreets }) => {
        // Update local state with saved IDs
        savedStreets.forEach((saved, i) => {
          newStreets[i].id = saved._id;
        });
        this.existingStreets.push(...savedStreets);
        this.showMessage(
          'success',
          `${savedStreets.length} rue(s) sauvegardée(s)`
        );
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving streets:', err);
        this.showMessage('error', 'Erreur lors de la sauvegarde');
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
        this.showMessage('success', 'Toutes les rues ont été supprimées');
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error deleting streets:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
        this.isSaving = false;
      },
    });
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  getNewStreetsCount(): number {
    return this.drawnStreets.filter((s) => !s.id).length;
  }

  getExistingStreetsCount(): number {
    return this.drawnStreets.filter((s) => s.id).length;
  }
}
