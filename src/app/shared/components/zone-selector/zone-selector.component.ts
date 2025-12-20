import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ParkingZone } from '../../../core/models/parking-zone.model';

@Component({
  selector: 'app-zone-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="zone-selector">
      <label>{{ label }}</label>

      @if (isLoading) {
        <div class="loading-zones">Chargement des zones...</div>
      } @else {
        <div class="zones-list">
          @for (zone of zones; track zone._id) {
            <label class="zone-checkbox">
              <input
                type="checkbox"
                [checked]="isSelected(zone._id)"
                (change)="toggleZone(zone._id)"
              />
              <span class="zone-info">
                <span class="zone-name">{{ zone.name }}</span>
                <span class="zone-code">{{ zone.code }}</span>
              </span>
            </label>
          } @empty {
            <div class="no-zones">Aucune zone disponible</div>
          }
        </div>

        @if (selectedZoneIds.length > 0) {
          <div class="selected-count">
            {{ selectedZoneIds.length }} zone(s) sélectionnée(s)
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .zone-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .zone-selector > label {
      font-size: 0.813rem;
      color: var(--app-text-secondary);
    }

    .loading-zones {
      padding: 12px;
      color: var(--app-text-secondary);
      font-size: 0.875rem;
      text-align: center;
    }

    .zones-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      background: var(--app-surface);
    }

    .zone-checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--app-border);
      transition: background 0.2s ease;
    }

    .zone-checkbox:last-child {
      border-bottom: none;
    }

    .zone-checkbox:hover {
      background: var(--app-surface-variant);
    }

    .zone-checkbox input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .zone-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .zone-name {
      font-size: 0.875rem;
      color: var(--app-text-primary);
    }

    .zone-code {
      font-size: 0.75rem;
      color: var(--app-text-secondary);
      font-family: monospace;
    }

    .no-zones {
      padding: 20px;
      text-align: center;
      color: var(--app-text-secondary);
      font-size: 0.875rem;
    }

    .selected-count {
      font-size: 0.75rem;
      color: var(--color-secondary);
      padding-top: 4px;
    }
  `]
})
export class ZoneSelectorComponent implements OnInit {
  @Input() label = 'Zones assignées';
  @Input() selectedZoneIds: string[] = [];
  @Output() selectedZoneIdsChange = new EventEmitter<string[]>();

  zones: ParkingZone[] = [];
  isLoading = true;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadZones();
  }

  loadZones(): void {
    this.isLoading = true;
    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => {
        this.zones = data.filter(z => z.isActive);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading zones:', err);
        this.isLoading = false;
      },
    });
  }

  isSelected(zoneId: string): boolean {
    return this.selectedZoneIds.includes(zoneId);
  }

  toggleZone(zoneId: string): void {
    const newSelection = this.isSelected(zoneId)
      ? this.selectedZoneIds.filter(id => id !== zoneId)
      : [...this.selectedZoneIds, zoneId];

    this.selectedZoneIds = newSelection;
    this.selectedZoneIdsChange.emit(newSelection);
  }
}
