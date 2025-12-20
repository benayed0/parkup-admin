import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Zone } from '../models/zone.model';

interface ZonesResponse {
  success: boolean;
  data: Zone[];
  count: number;
}

interface ZoneResponse {
  success: boolean;
  data: Zone;
}

@Injectable({
  providedIn: 'root',
})
export class ZonesService {
  private readonly API_URL = `${environment.apiUrl}/zones`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { isActive?: boolean }): Observable<ZonesResponse> {
    const params: any = {};
    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive.toString();
    }
    // Use admin endpoint for filtered zones based on operator's assigned zones
    return this.http.get<ZonesResponse>(`${this.API_URL}/admin`, { params });
  }

  getById(id: string): Observable<ZoneResponse> {
    return this.http.get<ZoneResponse>(`${this.API_URL}/${id}`);
  }

  getByCode(code: string): Observable<ZoneResponse> {
    return this.http.get<ZoneResponse>(`${this.API_URL}/code/${code}`);
  }
}
