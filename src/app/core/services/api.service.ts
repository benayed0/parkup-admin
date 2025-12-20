import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParkingZone } from '../models/parking-zone.model';
import { Street, CreateStreetDto } from '../models/street.model';
import { Agent, CreateAgentDto, UpdateAgentDto } from '../models/agent.model';
import { Ticket, TicketStatus } from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Parking Zones (admin endpoint - filtered by operator's zones)
  getParkingZones(): Observable<{
    count: number;
    data: ParkingZone[];
    success: boolean;
  }> {
    return this.http.get<{
      count: number;
      data: ParkingZone[];
      success: boolean;
    }>(`${this.apiUrl}/zones/admin`);
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

  // ==================== AGENTS ====================

  getAgents(params?: {
    isActive?: boolean;
    zoneId?: string;
    limit?: number;
    skip?: number;
  }): Observable<{ data: Agent[]; success: boolean; count: number }> {
    let httpParams = new HttpParams();
    if (params?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }
    if (params?.zoneId) {
      httpParams = httpParams.set('zoneId', params.zoneId);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    return this.http.get<{ data: Agent[]; success: boolean; count: number }>(
      `${this.apiUrl}/agents`,
      { params: httpParams }
    );
  }

  getAgent(id: string): Observable<{ data: Agent; success: boolean }> {
    return this.http.get<{ data: Agent; success: boolean }>(
      `${this.apiUrl}/agents/${id}`
    );
  }

  createAgent(
    agent: CreateAgentDto
  ): Observable<{ data: Agent; success: boolean }> {
    return this.http.post<{ data: Agent; success: boolean }>(
      `${this.apiUrl}/agents`,
      agent
    );
  }

  updateAgent(
    id: string,
    agent: UpdateAgentDto
  ): Observable<{ data: Agent; success: boolean }> {
    return this.http.put<{ data: Agent; success: boolean }>(
      `${this.apiUrl}/agents/${id}`,
      agent
    );
  }

  activateAgent(id: string): Observable<{ data: Agent; success: boolean }> {
    return this.http.patch<{ data: Agent; success: boolean }>(
      `${this.apiUrl}/agents/${id}/activate`,
      {}
    );
  }

  deactivateAgent(id: string): Observable<{ data: Agent; success: boolean }> {
    return this.http.patch<{ data: Agent; success: boolean }>(
      `${this.apiUrl}/agents/${id}/deactivate`,
      {}
    );
  }

  deleteAgent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agents/${id}`);
  }

  resetAgentPassword(
    id: string,
    newPassword: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.apiUrl}/agents/${id}/reset-password`,
      { newPassword }
    );
  }

  // ==================== TICKETS ====================

  getTickets(params?: {
    userId?: string;
    agentId?: string;
    status?: TicketStatus;
    licensePlate?: string;
    limit?: number;
    skip?: number;
  }): Observable<{ data: Ticket[]; success: boolean; count: number }> {
    let httpParams = new HttpParams();
    if (params?.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }
    if (params?.agentId) {
      httpParams = httpParams.set('agentId', params.agentId);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.licensePlate) {
      httpParams = httpParams.set('licensePlate', params.licensePlate);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    return this.http.get<{ data: Ticket[]; success: boolean; count: number }>(
      `${this.apiUrl}/tickets`,
      { params: httpParams }
    );
  }

  getTicket(id: string): Observable<{ data: Ticket; success: boolean }> {
    return this.http.get<{ data: Ticket; success: boolean }>(
      `${this.apiUrl}/tickets/${id}`
    );
  }

  getTicketsByAgent(
    agentId: string
  ): Observable<{ data: Ticket[]; success: boolean; count: number }> {
    return this.http.get<{ data: Ticket[]; success: boolean; count: number }>(
      `${this.apiUrl}/tickets/agent/${agentId}`
    );
  }

  dismissTicket(id: string): Observable<{ data: Ticket; success: boolean }> {
    return this.http.patch<{ data: Ticket; success: boolean }>(
      `${this.apiUrl}/tickets/${id}/dismiss`,
      {}
    );
  }

  deleteTicket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tickets/${id}`);
  }
}
