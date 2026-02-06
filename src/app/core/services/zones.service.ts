import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Zone, CreateZoneDto, UpdateZoneDto } from '../models/zone.model';

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
  private readonly CACHE_DURATION = 30_000; // 30 seconds

  private zonesCache$: Observable<ZonesResponse> | null = null;
  private cacheExpiry = 0;

  constructor(private http: HttpClient) {}

  getAll(filters?: { isActive?: boolean }): Observable<ZonesResponse> {
    // Only cache unfiltered requests
    if (!filters && this.zonesCache$ && Date.now() < this.cacheExpiry) {
      return this.zonesCache$;
    }

    const params: any = {};
    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive.toString();
    }

    const request$ = this.http
      .get<ZonesResponse>(`${this.API_URL}/admin`, { params })
      .pipe(shareReplay(1));

    if (!filters) {
      this.zonesCache$ = request$;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    }

    return request$;
  }

  getById(id: string): Observable<ZoneResponse> {
    return this.http.get<ZoneResponse>(`${this.API_URL}/${id}`);
  }

  getByCode(code: string): Observable<ZoneResponse> {
    return this.http.get<ZoneResponse>(`${this.API_URL}/code/${code}`);
  }

  create(zone: CreateZoneDto): Observable<ZoneResponse> {
    return this.http.post<ZoneResponse>(this.API_URL, zone).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: string, zone: UpdateZoneDto): Observable<ZoneResponse> {
    return this.http.put<ZoneResponse>(`${this.API_URL}/${id}`, zone).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.zonesCache$ = null;
    this.cacheExpiry = 0;
  }
}
