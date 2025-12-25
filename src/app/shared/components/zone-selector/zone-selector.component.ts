import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ParkingZone } from '../../../core/models/parking-zone.model';

@Component({
  selector: 'app-zone-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone-selector.component.html',
  styleUrl: './zone-selector.component.css'
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
