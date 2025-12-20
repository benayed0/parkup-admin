import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParkingZone } from '../models/parking-zone.model';
import { Street, CreateStreetDto } from '../models/street.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Parking Zones
  getParkingZones(): Observable<{
    count: number;
    data: ParkingZone[];
    success: boolean;
  }> {
    return this.http.get<{
      count: number;
      data: ParkingZone[];
      success: boolean;
    }>(`${this.apiUrl}/zones`);
  }

  getParkingZone(id: string): Observable<ParkingZone> {
    return this.http.get<ParkingZone>(`${this.apiUrl}/zones/${id}`);
  }

  // Streets
  getStreetsByZone(
    zoneId: string
  ): Observable<{ data: Street[]; success: boolean; count: number }> {
    return this.http.get<{ data: Street[]; success: boolean; count: number }>(
      `${this.apiUrl}/streets/zone/${zoneId}`
    );
  }

  getAllStreets(): Observable<Street[]> {
    return this.http.get<Street[]>(`${this.apiUrl}/streets`);
  }

  createStreet(street: CreateStreetDto): Observable<Street> {
    return this.http.post<Street>(`${this.apiUrl}/streets`, street);
  }

  createStreetsBulk(
    streets: CreateStreetDto[]
  ): Observable<{ data: Street[]; success: boolean; count: number }> {
    return this.http.post<{ data: Street[]; success: boolean; count: number }>(
      `${this.apiUrl}/streets/bulk`,
      streets
    );
  }

  updateStreet(
    id: string,
    street: Partial<CreateStreetDto>
  ): Observable<Street> {
    return this.http.patch<Street>(`${this.apiUrl}/streets/${id}`, street);
  }

  deleteStreet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/streets/${id}`);
  }

  deleteStreetsByZone(zoneId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/streets/zone/${zoneId}`);
  }
}
