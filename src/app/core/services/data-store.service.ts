import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Agent } from '../models/agent.model';
import { ParkingZone } from '../models/parking-zone.model';

@Injectable({
  providedIn: 'root',
})
export class DataStoreService {
  private agentsSubject = new BehaviorSubject<Agent[]>([]);
  private zonesSubject = new BehaviorSubject<ParkingZone[]>([]);

  private agentsLoaded = false;
  private zonesLoaded = false;

  agents$: Observable<Agent[]> = this.agentsSubject.asObservable();
  zones$: Observable<ParkingZone[]> = this.zonesSubject.asObservable();

  constructor(private apiService: ApiService) {}

  loadAgents(): void {
    if (this.agentsLoaded) return;
    this.agentsLoaded = true;

    this.apiService.getAgents().subscribe({
      next: ({ data }) => this.agentsSubject.next(data),
      error: (err) => {
        console.error('DataStore: Error loading agents', err);
        this.agentsLoaded = false;
      },
    });
  }

  loadZones(): void {
    if (this.zonesLoaded) return;
    this.zonesLoaded = true;

    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => this.zonesSubject.next(data),
      error: (err) => {
        console.error('DataStore: Error loading zones', err);
        this.zonesLoaded = false;
      },
    });
  }

  refreshAgents(): void {
    this.agentsLoaded = false;
    this.apiService.getAgents().subscribe({
      next: ({ data }) => {
        this.agentsSubject.next(data);
        this.agentsLoaded = true;
      },
      error: (err) => console.error('DataStore: Error refreshing agents', err),
    });
  }

  refreshZones(): void {
    this.zonesLoaded = false;
    this.apiService.getParkingZones().subscribe({
      next: ({ data }) => {
        this.zonesSubject.next(data);
        this.zonesLoaded = true;
      },
      error: (err) => console.error('DataStore: Error refreshing zones', err),
    });
  }
}
