import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import { ZonesService } from '../../../core/services/zones.service';
import { Zone, CreateZoneDto, SeasonalPeriod } from '../../../core/models/zone.model';

@Component({
  selector: 'app-zone-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone-form-modal.component.html',
  styleUrl: './zone-form-modal.component.css',
})
export class ZoneFormModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() editingZone: Zone | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  formData = this.getEmptyFormData();
  formError = '';
  isSavingZone = false;

  private locationPickerMap: L.Map | null = null;
  private locationMarker: L.Marker | null = null;
  private destroy$ = new Subject<void>();

  readonly hourOptions: string[] = Array.from({ length: 24 }, (_, i) =>
    `${i.toString().padStart(2, '0')}:00`
  );

  readonly months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Fevrier' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Aout' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Decembre' },
  ];

  readonly days: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

  constructor(private zonesService: ZonesService) {}

  ngOnInit(): void {
    if (this.editingZone) {
      this.populateForm(this.editingZone);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initLocationPickerMap(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyLocationPickerMap();
  }

  getEmptyFormData() {
    return {
      code: '',
      name: '',
      description: '',
      address: '',
      phoneNumber: '',
      latitude: null as number | null,
      longitude: null as number | null,
      hourlyRate: null as number | null,
      is24h: false,
      hoursFrom: '08:00',
      hoursTo: '20:00',
      useSeasonalHours: false,
      seasonalPeriods: [] as SeasonalPeriod[],
      carSabot: null as number | null,
      pound: null as number | null,
      numberOfPlaces: null as number | null,
    };
  }

  private populateForm(zone: Zone): void {
    const useSeasonalHours =
      zone.seasonalOperatingHours && zone.seasonalOperatingHours.length > 0;
    const is24h = this.is24hOperation(zone.operatingHours);
    const [hoursFrom, hoursTo] = this.parseOperatingHours(zone.operatingHours);

    this.formData = {
      code: zone.code,
      name: zone.name,
      description: zone.description || '',
      address: zone.address || '',
      phoneNumber: zone.phoneNumber || '',
      latitude: zone.location.coordinates[1],
      longitude: zone.location.coordinates[0],
      hourlyRate: zone.hourlyRate,
      is24h,
      hoursFrom,
      hoursTo,
      useSeasonalHours: useSeasonalHours || false,
      seasonalPeriods: zone.seasonalOperatingHours
        ? [...zone.seasonalOperatingHours]
        : [],
      carSabot: zone.prices?.car_sabot || 0,
      pound: zone.prices?.pound || 0,
      numberOfPlaces: zone.numberOfPlaces || 0,
    };
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

    const normalizeHour = (h: string) => {
      const match = h.match(/(\d{1,2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:00`;
      }
      return h;
    };

    return [normalizeHour(from), normalizeHour(to)];
  }

  addSeasonalPeriod(): void {
    this.formData.seasonalPeriods.push({
      name: '',
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      is24h: false,
      hoursFrom: '08:00',
      hoursTo: '20:00',
    });
  }

  removeSeasonalPeriod(index: number): void {
    this.formData.seasonalPeriods.splice(index, 1);
  }

  close(): void {
    this.closed.emit();
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
      this.formError = 'Veuillez specifier les horaires par defaut';
      return;
    }

    if (this.formData.useSeasonalHours) {
      if (this.formData.seasonalPeriods.length === 0) {
        this.formError = 'Veuillez ajouter au moins une periode saisonniere';
        return;
      }
      for (const period of this.formData.seasonalPeriods) {
        if (!period.name) {
          this.formError = 'Veuillez nommer toutes les periodes';
          return;
        }
        if (!period.is24h && (!period.hoursFrom || !period.hoursTo)) {
          this.formError = `Veuillez specifier les horaires pour "${period.name}"`;
          return;
        }
      }
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
      seasonalOperatingHours: this.formData.useSeasonalHours
        ? this.formData.seasonalPeriods
        : [],
      prices: {
        car_sabot: this.formData.carSabot || 0,
        pound: this.formData.pound || 0,
      },
      numberOfPlaces: this.formData.numberOfPlaces || 0,
      description: this.formData.description || undefined,
      address: this.formData.address || undefined,
      phoneNumber: this.formData.phoneNumber || undefined,
    };

    const request = this.editingZone
      ? this.zonesService.update(this.editingZone._id, zoneData)
      : this.zonesService.create(zoneData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSavingZone = false;
        this.saved.emit();
      },
      error: (err) => {
        this.formError =
          err.error?.message || "Erreur lors de l'enregistrement";
        this.isSavingZone = false;
      },
    });
  }

  // ==================== LOCATION PICKER ====================

  private initLocationPickerMap(): void {
    const mapElement = document.getElementById('location-picker-map');
    if (!mapElement || this.locationPickerMap) return;

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

    if (this.formData.latitude && this.formData.longitude) {
      this.locationMarker = L.marker([this.formData.latitude, this.formData.longitude]).addTo(this.locationPickerMap);
    }

    this.locationPickerMap.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.formData.latitude = lat;
      this.formData.longitude = lng;

      if (this.locationMarker) {
        this.locationMarker.setLatLng([lat, lng]);
      } else {
        this.locationMarker = L.marker([lat, lng]).addTo(this.locationPickerMap!);
      }
    });

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
}
