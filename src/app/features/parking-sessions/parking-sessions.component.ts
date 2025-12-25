import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ParkingSession,
  ParkingSessionStatus,
  LicensePlate,
  PlateType,
} from '../../core/models/parking-session.model';
import { ParkingZone, ZoneOccupation } from '../../core/models/parking-zone.model';
import { PopulatedZone } from '../../core/models/operator.model';
import {
  LicensePlateInputComponent,
  LicensePlateDisplayComponent,
} from '../../shared/components/license-plate-input';

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  todaySessions: number;
  todayRevenue: number;
  totalRevenue: number;
  avgDuration: number;
  completedToday: number;
  expiredToday: number;
}

@Component({
  selector: 'app-parking-sessions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LicensePlateInputComponent,
    LicensePlateDisplayComponent,
  ],
  templateUrl: './parking-sessions.component.html',
  styleUrl: './parking-sessions.component.css',
})
export class ParkingSessionsComponent implements OnInit, OnDestroy, AfterViewInit {
  sessions: ParkingSession[] = [];
  allSessions: ParkingSession[] = [];
  zones: ParkingZone[] = [];
  zoneOccupations: ZoneOccupation[] = [];
  isLoading = true;

  filterStatus = '';
  filterZoneId = '';
  searchPlate = '';
  searchPlateData: LicensePlate | null = null;

  viewMode: 'list' | 'map' = 'list';
  private map: L.Map | null = null;
  private markersLayer: L.MarkerClusterGroup | null = null;
  private sessionMarkers: Map<string, L.Marker> = new Map();
  private pendingLocateSessionId: string | null = null;

  showExtendModal = false;
  selectedSession: ParkingSession | null = null;
  extendMinutes: number = 30;
  extendAmount: number = 0.5;

  message: { type: 'success' | 'error'; text: string } | null = null;

  stats: SessionStats = {
    totalSessions: 0,
    activeSessions: 0,
    todaySessions: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    avgDuration: 0,
    completedToday: 0,
    expiredToday: 0,
  };

  private plateSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  private statusLabels: Record<ParkingSessionStatus, string> = {
    [ParkingSessionStatus.ACTIVE]: 'Active',
    [ParkingSessionStatus.COMPLETED]: 'Terminee',
    [ParkingSessionStatus.EXPIRED]: 'Expiree',
    [ParkingSessionStatus.CANCELLED]: 'Annulee',
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadZones();
    this.loadSessions();

    // Debounced plate search - filter locally for instant feedback
    this.plateSearch$
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterSessionsLocally();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  ngAfterViewInit(): void {
    // Map will be initialized when switching to map view
  }

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode = mode;
    if (mode === 'map') {
      setTimeout(() => this.initMap(), 0);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.updateMapMarkers();
      return;
    }

    const mapElement = document.getElementById('sessions-map');
    if (!mapElement) return;

    // Default to Tunisia center
    this.map = L.map('sessions-map', {
      center: [36.8065, 10.1815],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 50 : 60;
        return L.divIcon({
          html: `<div class="session-cluster-icon">${count}</div>`,
          className: 'session-cluster',
          iconSize: L.point(size, size),
        });
      },
    }).addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.sessionMarkers.clear();

    const bounds: L.LatLngBounds | null = this.sessions.length > 0 ? L.latLngBounds([]) : null;

    this.sessions.forEach((session) => {
      if (!session.location?.coordinates) return;

      const [lng, lat] = session.location.coordinates;
      const marker = L.marker([lat, lng], {
        icon: this.getMarkerIcon(session.status),
      });

      const popupContent = this.createPopupContent(session);
      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.addTo(this.markersLayer!);
      this.sessionMarkers.set(session._id, marker);
      bounds?.extend([lat, lng]);
    });

    if (this.pendingLocateSessionId) {
      const sessionId = this.pendingLocateSessionId;
      this.pendingLocateSessionId = null;
      setTimeout(() => this.focusOnSession(sessionId), 100);
    } else if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  locateOnMap(session: ParkingSession): void {
    if (!session.location?.coordinates) return;

    this.viewMode = 'map';
    this.pendingLocateSessionId = session._id;

    setTimeout(() => this.initMap(), 0);
  }

  private focusOnSession(sessionId: string): void {
    const marker = this.sessionMarkers.get(sessionId);
    if (!marker || !this.map) return;

    const latLng = marker.getLatLng();
    this.map.setView(latLng, 16, { animate: true });

    setTimeout(() => {
      marker.openPopup();
    }, 300);
  }

  private getMarkerIcon(status: ParkingSessionStatus): L.Icon {
    const colorMap: Record<string, string> = {
      active: '#22c55e',
      completed: '#3b82f6',
      expired: '#f59e0b',
      cancelled: '#9e9e9e',
    };

    const color = colorMap[status] || '#6b7280';

    return L.icon({
      iconUrl: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle fill="white" cx="12" cy="9" r="3"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }

  private createPopupContent(session: ParkingSession): string {
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 200px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #1e3a5f;">
          ${session.licensePlate}
        </div>
        <div style="display: grid; gap: 6px; font-size: 13px;">
          <div><strong>Zone:</strong> ${session.zoneName}</div>
          <div><strong>Durée:</strong> ${session.durationMinutes} min</div>
          <div><strong>Montant:</strong> ${session.amount} DT</div>
          <div><strong>Statut:</strong> ${this.getStatusLabel(session.status)}</div>
          <div><strong>Début:</strong> ${new Date(session.startTime).toLocaleString('fr-FR')}</div>
          <div><strong>Fin:</strong> ${new Date(session.endTime).toLocaleString('fr-FR')}</div>
        </div>
      </div>
    `;
  }

  get isSuperAdmin(): boolean {
    return this.authService.currentOperator?.role === 'super_admin';
  }

  get operatorZoneIds(): string[] {
    const operator = this.authService.currentOperator;
    if (!operator?.zoneIds) return [];
    return operator.zoneIds.map((zone) =>
      typeof zone === 'string' ? zone : (zone as PopulatedZone)._id
    );
  }

  loadZones(): void {
    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => {
        this.zones = data;
      },
      error: (err) => console.error('Error loading zones:', err),
    });
  }

  onPlateSearchChange(plate: LicensePlate): void {
    this.searchPlateData = plate;
    this.searchPlate = plate.formatted || '';
    // Trigger local filtering
    this.plateSearch$.next(`${plate.type}:${this.searchPlate}`);
  }

  loadSessions(): void {
    this.isLoading = true;
    const params: any = { limit: 500 };

    // Only send status/zone filters to API
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterZoneId) {
      params.zoneId = this.filterZoneId;
    }

    this.apiService.getParkingSessions(params).subscribe({
      next: ({ data }) => {
        // Filter sessions by operator's zones if not super_admin
        if (!this.isSuperAdmin) {
          const allowedZoneIds = this.operatorZoneIds;
          this.allSessions = data.filter((session) =>
            allowedZoneIds.includes(session.zoneId)
          );
        } else {
          this.allSessions = data;
        }

        // Apply local plate filter
        this.filterSessionsLocally();
        this.calculateStats();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.showMessage('error', 'Erreur lors du chargement des sessions');
        this.isLoading = false;
      },
    });
  }

  private filterSessionsLocally(): void {
    if (!this.searchPlateData || this.isPlateSearchEmpty()) {
      this.sessions = this.allSessions;
      return;
    }

    const searchLeft = this.searchPlateData.left?.trim().toLowerCase() || '';
    const searchRight = this.searchPlateData.right?.trim().toLowerCase() || '';
    const searchType = this.searchPlateData.type;

    this.sessions = this.allSessions.filter((session) => {
      // If session has plate object, use structured search
      if (session.plate) {
        // Check plate type matches
        if (session.plate.type !== searchType) {
          return false;
        }

        // Check left part (starts with)
        if (searchLeft) {
          const sessionLeft = (session.plate.left || '').toLowerCase();
          if (!sessionLeft.startsWith(searchLeft)) {
            return false;
          }
        }

        // Check right part (starts with)
        if (searchRight) {
          const sessionRight = (session.plate.right || '').toLowerCase();
          if (!sessionRight.startsWith(searchRight)) {
            return false;
          }
        }

        return true;
      }

      // Fallback: search in licensePlate string for older sessions
      const licensePlate = session.licensePlate.toLowerCase();
      const searchTerm = (searchLeft + searchRight).toLowerCase();
      return searchTerm ? licensePlate.includes(searchTerm) : true;
    });
  }

  private isPlateSearchEmpty(): boolean {
    if (!this.searchPlateData) return true;
    const hasLeft = this.searchPlateData.left?.trim();
    const hasRight = this.searchPlateData.right?.trim();
    return !hasLeft && !hasRight;
  }

  private calculateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySessions = this.allSessions.filter((s) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= today;
    });

    const completedTodaySessions = todaySessions.filter(
      (s) => s.status === ParkingSessionStatus.COMPLETED
    );

    const expiredTodaySessions = todaySessions.filter(
      (s) => s.status === ParkingSessionStatus.EXPIRED
    );

    const activeSessions = this.allSessions.filter(
      (s) => s.status === ParkingSessionStatus.ACTIVE
    );

    const totalDuration = this.allSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    this.stats = {
      totalSessions: this.allSessions.length,
      activeSessions: activeSessions.length,
      todaySessions: todaySessions.length,
      todayRevenue: todaySessions.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalRevenue: this.allSessions.reduce(
        (sum, s) => sum + (s.amount || 0),
        0
      ),
      avgDuration:
        this.allSessions.length > 0
          ? totalDuration / this.allSessions.length
          : 0,
      completedToday: completedTodaySessions.length,
      expiredToday: expiredTodaySessions.length,
    };

    this.calculateZoneOccupations();
  }

  private calculateZoneOccupations(): void {
    if (!this.zones.length) return;

    const activeSessionsByZone = new Map<string, number>();

    // Count active sessions per zone
    this.allSessions
      .filter((s) => s.status === ParkingSessionStatus.ACTIVE)
      .forEach((session) => {
        const count = activeSessionsByZone.get(session.zoneId) || 0;
        activeSessionsByZone.set(session.zoneId, count + 1);
      });

    // Calculate occupation for each zone
    this.zoneOccupations = this.zones
      .filter((zone) => zone.numberOfPlaces > 0)
      .map((zone) => {
        const activeSessions = activeSessionsByZone.get(zone._id) || 0;
        const occupationRate = Math.min(
          100,
          Math.round((activeSessions / zone.numberOfPlaces) * 100)
        );

        return {
          zoneId: zone._id,
          zoneName: zone.name,
          zoneCode: zone.code,
          numberOfPlaces: zone.numberOfPlaces,
          activeSessions,
          occupationRate,
        };
      })
      .sort((a, b) => b.occupationRate - a.occupationRate);
  }

  isOverdue(session: ParkingSession): boolean {
    if (session.status !== ParkingSessionStatus.ACTIVE) return false;
    return new Date(session.endTime) < new Date();
  }

  getStatusLabel(status: ParkingSessionStatus): string {
    return this.statusLabels[status] || status;
  }

  getEffectiveStatus(session: ParkingSession): ParkingSessionStatus {
    // If session is active but end time has passed, show as expired
    if (
      session.status === ParkingSessionStatus.ACTIVE &&
      new Date(session.endTime) < new Date()
    ) {
      return ParkingSessionStatus.EXPIRED;
    }
    return session.status;
  }

  openExtendModal(session: ParkingSession): void {
    this.selectedSession = session;
    this.extendMinutes = 30;
    this.extendAmount = 0.5;
    this.showExtendModal = true;
  }

  closeExtendModal(): void {
    this.showExtendModal = false;
    this.selectedSession = null;
  }

  extendSession(): void {
    if (
      !this.selectedSession ||
      !this.extendMinutes ||
      this.extendMinutes < 1
    ) {
      return;
    }

    this.apiService
      .extendParkingSession(this.selectedSession._id, {
        additionalMinutes: this.extendMinutes,
        additionalAmount: this.extendAmount || 0,
      })
      .subscribe({
        next: ({ data }) => {
          const index = this.sessions.findIndex(
            (s) => s._id === this.selectedSession?._id
          );
          if (index !== -1) {
            this.sessions[index] = data;
          }
          const allIndex = this.allSessions.findIndex(
            (s) => s._id === this.selectedSession?._id
          );
          if (allIndex !== -1) {
            this.allSessions[allIndex] = data;
          }
          this.calculateStats();
          this.showMessage('success', 'Session prolongee avec succes');
          this.closeExtendModal();
        },
        error: (err) => {
          console.error('Error extending session:', err);
          this.showMessage('error', 'Erreur lors de la prolongation');
        },
      });
  }

  endSession(session: ParkingSession): void {
    if (!confirm(`Terminer la session pour ${session.licensePlate} ?`)) {
      return;
    }

    this.apiService.endParkingSession(session._id).subscribe({
      next: ({ data }) => {
        const index = this.sessions.findIndex((s) => s._id === session._id);
        if (index !== -1) {
          this.sessions[index] = data;
        }
        const allIndex = this.allSessions.findIndex(
          (s) => s._id === session._id
        );
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session terminee');
      },
      error: (err) => {
        console.error('Error ending session:', err);
        this.showMessage('error', 'Erreur lors de la terminaison');
      },
    });
  }

  cancelSession(session: ParkingSession): void {
    if (!confirm(`Annuler la session pour ${session.licensePlate} ?`)) {
      return;
    }

    this.apiService.cancelParkingSession(session._id).subscribe({
      next: ({ data }) => {
        const index = this.sessions.findIndex((s) => s._id === session._id);
        if (index !== -1) {
          this.sessions[index] = data;
        }
        const allIndex = this.allSessions.findIndex(
          (s) => s._id === session._id
        );
        if (allIndex !== -1) {
          this.allSessions[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Session annulee');
      },
      error: (err) => {
        console.error('Error cancelling session:', err);
        this.showMessage('error', "Erreur lors de l'annulation");
      },
    });
  }

  deleteSession(session: ParkingSession): void {
    if (
      !confirm(
        `Supprimer definitivement la session pour ${session.licensePlate} ?`
      )
    ) {
      return;
    }

    this.apiService.deleteParkingSession(session._id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s._id !== session._id);
        this.allSessions = this.allSessions.filter(
          (s) => s._id !== session._id
        );
        this.calculateStats();
        this.showMessage('success', 'Session supprimee');
      },
      error: (err) => {
        console.error('Error deleting session:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
      },
    });
  }

  updateExpiredSessions(): void {
    this.apiService.updateExpiredSessions().subscribe({
      next: ({ count, message }) => {
        this.showMessage(
          'success',
          message || `${count} session(s) mise(s) a jour`
        );
        this.loadSessions();
      },
      error: (err) => {
        console.error('Error updating expired sessions:', err);
        this.showMessage('error', 'Erreur lors de la mise a jour');
      },
    });
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
