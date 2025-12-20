import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Operator, OperatorRole } from '../models/operator.model';

interface OperatorsResponse {
  success: boolean;
  data: Operator[];
  count: number;
}

interface OperatorResponse {
  success: boolean;
  data: Operator;
}

export interface CreateOperatorDto {
  email: string;
  name: string;
  role?: OperatorRole;
  zoneIds?: string[];
  isActive?: boolean;
}

export interface UpdateOperatorDto {
  email?: string;
  name?: string;
  role?: OperatorRole;
  zoneIds?: string[];
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorsService {
  private readonly API_URL = `${environment.apiUrl}/operators`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { isActive?: boolean; role?: OperatorRole }): Observable<OperatorsResponse> {
    const params: any = {};
    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive.toString();
    }
    if (filters?.role) {
      params.role = filters.role;
    }
    return this.http.get<OperatorsResponse>(this.API_URL, { params });
  }

  getById(id: string): Observable<OperatorResponse> {
    return this.http.get<OperatorResponse>(`${this.API_URL}/${id}`);
  }

  create(dto: CreateOperatorDto): Observable<OperatorResponse> {
    return this.http.post<OperatorResponse>(this.API_URL, dto);
  }

  update(id: string, dto: UpdateOperatorDto): Observable<OperatorResponse> {
    return this.http.put<OperatorResponse>(`${this.API_URL}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  activate(id: string): Observable<OperatorResponse> {
    return this.http.put<OperatorResponse>(`${this.API_URL}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<OperatorResponse> {
    return this.http.put<OperatorResponse>(`${this.API_URL}/${id}/deactivate`, {});
  }

  updateZones(id: string, zoneIds: string[]): Observable<OperatorResponse> {
    return this.http.put<OperatorResponse>(`${this.API_URL}/${id}/zones`, { zoneIds });
  }
}
