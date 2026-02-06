import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { ApiService } from '../../core/services/api.service';
import {
  Ticket,
  TicketStatus,
  TicketReason,
} from '../../core/models/ticket.model';
import { Agent } from '../../core/models/agent.model';
import {
  LicensePlate,
  ParkingSessionStatus,
} from '../../core/models/parking-session.model';
import {
  ParkingZone,
  ZoneOccupation,
} from '../../core/models/parking-zone.model';
import {
  LicensePlateInputComponent,
  LicensePlateDisplayComponent,
} from '../../shared/components/license-plate-input';

interface TicketStats {
  totalTickets: number;
  pendingTickets: number;
  todayTickets: number;
  todayFines: number;
  totalFines: number;
  paidTickets: number;
  overdueTickets: number;
  paidToday: number;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LicensePlateInputComponent,
    LicensePlateDisplayComponent,
  ],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css',
})
export class TicketsComponent implements OnInit, OnDestroy, AfterViewInit {
  tickets: Ticket[] = [];
  allTickets: Ticket[] = []; // All tickets from API (filtered by status/agent)
  agents: Agent[] = [];
  zones: ParkingZone[] = [];
  zoneOccupations: ZoneOccupation[] = [];
  isLoading = true;

  filterStatus = '';
  filterAgentId = '';
  searchPlate = '';
  searchPlateData: LicensePlate | null = null;

  viewMode: 'list' | 'map' = 'list';
  private map: L.Map | null = null;
  private markersLayer: L.MarkerClusterGroup | null = null;
  private ticketMarkers: Map<string, L.Marker> = new Map();
  private pendingLocateTicketId: string | null = null;

  message: { type: 'success' | 'error'; text: string } | null = null;
  qrModal: { visible: boolean; dataUrl: string; ticketNumber: string } = {
    visible: false,
    dataUrl: '',
    ticketNumber: '',
  };

  stats: TicketStats = {
    totalTickets: 0,
    pendingTickets: 0,
    todayTickets: 0,
    todayFines: 0,
    totalFines: 0,
    paidTickets: 0,
    overdueTickets: 0,
    paidToday: 0,
  };

  private plateSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  private reasonLabels: Record<TicketReason, string> = {
    [TicketReason.POUND]: 'Fourrière',
    [TicketReason.CAR_SABOT]: 'Sabot',
  };

  private statusLabels: Record<TicketStatus, string> = {
    [TicketStatus.PENDING]: 'En attente',
    [TicketStatus.PAID]: 'Payé',
    [TicketStatus.SABOT_REMOVED]: 'Sabot retiré',
    [TicketStatus.OVERDUE]: 'En retard',
    [TicketStatus.APPEALED]: 'Contesté',
    [TicketStatus.DISMISSED]: 'Annulé',
  };

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadTickets();
    this.loadZonesAndOccupation();

    // Debounced plate search - filter locally for instant feedback
    this.plateSearch$
      .pipe(
        debounceTime(150), // Faster since it's local
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterTicketsLocally();
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
      // Delay map init to allow DOM to render
      setTimeout(() => this.initMap(), 0);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.updateMapMarkers();
      return;
    }

    const mapElement = document.getElementById('tickets-map');
    if (!mapElement) return;

    // Default to Casablanca center
    this.map = L.map('tickets-map', {
      center: [33.5731, -7.5898],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Use MarkerClusterGroup to handle overlapping markers
    this.markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 50 : 60;
        return L.divIcon({
          html: `<div class="ticket-cluster-icon">${count}</div>`,
          className: 'ticket-cluster',
          iconSize: L.point(size, size),
        });
      },
    }).addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.ticketMarkers.clear();

    const bounds: L.LatLngBounds | null =
      this.tickets.length > 0 ? L.latLngBounds([]) : null;

    this.tickets.forEach((ticket) => {
      if (!ticket.position?.coordinates) return;

      const [lng, lat] = ticket.position.coordinates;
      const marker = L.marker([lat, lng], {
        icon: this.getMarkerIcon(ticket.status),
      });

      const popupContent = this.createPopupContent(ticket);
      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.addTo(this.markersLayer!);
      this.ticketMarkers.set(ticket._id, marker);
      bounds?.extend([lat, lng]);
    });

    // Check if there's a pending locate request
    if (this.pendingLocateTicketId) {
      const ticketId = this.pendingLocateTicketId;
      this.pendingLocateTicketId = null;
      setTimeout(() => this.focusOnTicket(ticketId), 100);
    } else if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  locateOnMap(ticket: Ticket): void {
    if (!ticket.position?.coordinates) return;

    // Switch to map view
    this.viewMode = 'map';
    this.pendingLocateTicketId = ticket._id;

    // Initialize map (will handle the locate after markers are created)
    setTimeout(() => this.initMap(), 0);
  }

  private focusOnTicket(ticketId: string): void {
    const marker = this.ticketMarkers.get(ticketId);
    if (!marker || !this.map) return;

    const latLng = marker.getLatLng();
    this.map.setView(latLng, 16, { animate: true });

    // Open the popup after a short delay to let the map animate
    setTimeout(() => {
      marker.openPopup();
    }, 300);
  }

  private getMarkerIcon(status: TicketStatus): L.Icon {
    const colorMap: Record<string, string> = {
      pending: '#f59e0b',
      paid: '#22c55e',
      overdue: '#ef4444',
      appealed: '#3b82f6',
      dismissed: '#9e9e9e',
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

  private createPopupContent(ticket: Ticket): string {
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 200px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #1e3a5f;">
          ${ticket.ticketNumber}
        </div>
        <div style="display: grid; gap: 6px; font-size: 13px;">
          <div><strong>Plaque:</strong> ${ticket.licensePlate}</div>
          <div><strong>Raison:</strong> ${this.getReasonLabel(
            ticket.reason
          )}</div>
          <div><strong>Montant:</strong> ${ticket.fineAmount} TND</div>
          <div><strong>Statut:</strong> ${this.getStatusLabel(
            ticket.status
          )}</div>
          <div><strong>Date:</strong> ${new Date(
            ticket.issuedAt
          ).toLocaleString('fr-FR')}</div>
        </div>
      </div>
    `;
  }

  loadAgents(): void {
    this.apiService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data }) => {
        this.agents = data;
      },
      error: (err) => console.error('Error loading agents:', err),
    });
  }

  loadZonesAndOccupation(): void {
    // Load zones first
    this.apiService.getParkingZones().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data: zones }) => {
        this.zones = zones;
        // Then load active sessions to calculate occupation
        this.apiService
          .getParkingSessions({
            status: ParkingSessionStatus.ACTIVE,
            limit: 1000,
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ data: sessions }) => {
              this.calculateZoneOccupations(sessions);
            },
            error: (err) =>
              console.error('Error loading sessions for occupation:', err),
          });
      },
      error: (err) => console.error('Error loading zones:', err),
    });
  }

  private calculateZoneOccupations(sessions: any[]): void {
    if (!this.zones.length) return;

    const activeSessionsByZone = new Map<string, number>();

    // Count active sessions per zone
    sessions.forEach((session) => {
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

  onPlateSearchChange(plate: LicensePlate): void {
    this.searchPlateData = plate;
    this.searchPlate = plate.formatted || '';
    // Include type in the search key so changing type also triggers search
    this.plateSearch$.next(`${plate.type}:${this.searchPlate}`);
  }

  loadTickets(): void {
    this.isLoading = true;
    const params: any = {};

    // Only send status/agent filters to API
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterAgentId) {
      params.agentId = this.filterAgentId;
    }

    this.apiService.getTickets(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data }) => {
        this.allTickets = data;
        this.filterTicketsLocally();
        this.calculateStats();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.showMessage('error', 'Erreur lors du chargement des tickets');
        this.isLoading = false;
      },
    });
  }

  private calculateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayTickets = this.allTickets.filter((t) => {
      const ticketDate = new Date(t.issuedAt);
      return ticketDate >= today;
    });

    const paidTodayTickets = todayTickets.filter(
      (t) => t.status === TicketStatus.PAID
    );

    const pendingTickets = this.allTickets.filter(
      (t) => t.status === TicketStatus.PENDING
    );

    const overdueTickets = this.allTickets.filter(
      (t) => t.status === TicketStatus.OVERDUE
    );

    const paidTickets = this.allTickets.filter(
      (t) => t.status === TicketStatus.PAID
    );

    this.stats = {
      totalTickets: this.allTickets.length,
      pendingTickets: pendingTickets.length,
      todayTickets: todayTickets.length,
      todayFines: todayTickets.reduce((sum, t) => sum + (t.fineAmount || 0), 0),
      totalFines: this.allTickets.reduce(
        (sum, t) => sum + (t.fineAmount || 0),
        0
      ),
      paidTickets: paidTickets.length,
      overdueTickets: overdueTickets.length,
      paidToday: paidTodayTickets.length,
    };
  }

  private filterTicketsLocally(): void {
    if (!this.searchPlateData || this.isPlateSearchEmpty()) {
      this.tickets = this.allTickets;
      this.updateMapMarkers();
      return;
    }

    const searchLeft = this.searchPlateData.left?.trim().toLowerCase() || '';
    const searchRight = this.searchPlateData.right?.trim().toLowerCase() || '';
    const searchType = this.searchPlateData.type;

    this.tickets = this.allTickets.filter((ticket) => {
      // If ticket has plate object, use structured search
      if (ticket.plate) {
        // Check plate type matches
        if (ticket.plate.type !== searchType) {
          return false;
        }

        // Check left part (starts with)
        if (searchLeft) {
          const ticketLeft = (ticket.plate.left || '').toLowerCase();
          if (!ticketLeft.startsWith(searchLeft)) {
            return false;
          }
        }

        // Check right part (starts with)
        if (searchRight) {
          const ticketRight = (ticket.plate.right || '').toLowerCase();
          if (!ticketRight.startsWith(searchRight)) {
            return false;
          }
        }

        return true;
      }

      // Fallback: search in licensePlate string for older tickets
      const licensePlate = ticket.licensePlate.toLowerCase();
      const searchTerm = (searchLeft + searchRight).toLowerCase();
      return searchTerm ? licensePlate.includes(searchTerm) : true;
    });

    this.updateMapMarkers();
  }

  private isPlateSearchEmpty(): boolean {
    if (!this.searchPlateData) return true;
    const hasLeft = this.searchPlateData.left?.trim();
    const hasRight = this.searchPlateData.right?.trim();
    return !hasLeft && !hasRight;
  }

  getReasonLabel(reason: TicketReason): string {
    return this.reasonLabels[reason] || reason;
  }

  getStatusLabel(status: TicketStatus): string {
    return this.statusLabels[status] || status;
  }

  getReasonIcon(reason: TicketReason): SafeHtml {
    const icons: Record<TicketReason, string> = {
      [TicketReason.POUND]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      [TicketReason.CAR_SABOT]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[reason] || '');
  }

  getStatusIcon(status: TicketStatus): SafeHtml {
    const icons: Record<TicketStatus, string> = {
      [TicketStatus.PENDING]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      [TicketStatus.PAID]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      [TicketStatus.SABOT_REMOVED]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      [TicketStatus.OVERDUE]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      [TicketStatus.APPEALED]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      [TicketStatus.DISMISSED]:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[status] || '');
  }

  getAgentName(agentId: Agent | string): string {
    if (typeof agentId === 'object' && agentId !== null) {
      return agentId.name;
    }
    const agent = this.agents.find((a) => a._id === agentId);
    return agent?.name || 'Inconnu';
  }

  dismissTicket(ticket: Ticket): void {
    if (!confirm(`Annuler le ticket ${ticket.ticketNumber} ?`)) {
      return;
    }

    this.apiService.dismissTicket(ticket._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data }) => {
        const index = this.tickets.findIndex((t) => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = data;
        }
        const allIndex = this.allTickets.findIndex((t) => t._id === ticket._id);
        if (allIndex !== -1) {
          this.allTickets[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Ticket annulé');
      },
      error: (err) => {
        console.error('Error dismissing ticket:', err);
        this.showMessage('error', "Erreur lors de l'annulation");
      },
    });
  }

  payTicket(ticket: Ticket): void {
    if (!confirm(`Marquer le ticket ${ticket.ticketNumber} comme payé ?`)) {
      return;
    }

    this.apiService.payTicket(ticket._id, 'cash').pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data }) => {
        const index = this.tickets.findIndex((t) => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = data;
        }
        const allIndex = this.allTickets.findIndex((t) => t._id === ticket._id);
        if (allIndex !== -1) {
          this.allTickets[allIndex] = data;
        }
        this.calculateStats();
        this.showMessage('success', 'Ticket marqué comme payé');
      },
      error: (err) => {
        console.error('Error paying ticket:', err);
        this.showMessage('error', 'Erreur lors du paiement');
      },
    });
  }

  deleteTicket(ticket: Ticket): void {
    if (
      !confirm(`Supprimer définitivement le ticket ${ticket.ticketNumber} ?`)
    ) {
      return;
    }

    this.apiService.deleteTicket(ticket._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.tickets = this.tickets.filter((t) => t._id !== ticket._id);
        this.allTickets = this.allTickets.filter((t) => t._id !== ticket._id);
        this.calculateStats();
        this.showMessage('success', 'Ticket supprimé');
      },
      error: (err) => {
        console.error('Error deleting ticket:', err);
        this.showMessage('error', 'Erreur lors de la suppression');
      },
    });
  }

  generateQrCode(ticket: Ticket): void {
    this.apiService.generateTicketToken(ticket._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ data }) => {
        this.qrModal = {
          visible: true,
          dataUrl: data.qrCodeDataUrl,
          ticketNumber: ticket.ticketNumber,
        };
      },
      error: (err) => {
        console.error('Error generating QR:', err);
        this.showMessage('error', 'Erreur lors de la génération du QR');
      },
    });
  }

  closeQrModal(): void {
    this.qrModal = { visible: false, dataUrl: '', ticketNumber: '' };
  }

  downloadQrCode(): void {
    const link = document.createElement('a');
    link.href = this.qrModal.dataUrl;
    link.download = `ticket-${this.qrModal.ticketNumber}-qr.png`;
    link.click();
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  getShortId(id: string): string {
    return id.slice(-6).toUpperCase();
  }

  copyId(id: string): void {
    navigator.clipboard.writeText(id).then(() => {
      this.showMessage('success', 'ID copié dans le presse-papiers');
    }).catch(() => {
      this.showMessage('error', 'Erreur lors de la copie');
    });
  }
}
