import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataStoreService } from '../../../core/services/data-store.service';
import { ParkingZone } from '../../../core/models/parking-zone.model';

@Component({
  selector: 'app-zone-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone-selector.component.html',
  styleUrl: './zone-selector.component.css'
})
export class ZoneSelectorComponent implements OnInit, OnDestroy {
  @Input() label = 'Zones assignées';
  @Input() selectedZoneIds: string[] = [];
  @Output() selectedZoneIdsChange = new EventEmitter<string[]>();

  zones: ParkingZone[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(private dataStore: DataStoreService) {}

  ngOnInit(): void {
    this.dataStore.loadZones();
    this.dataStore.zones$.pipe(takeUntil(this.destroy$)).subscribe((zones) => {
      this.zones = zones.filter(z => z.isActive);
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
