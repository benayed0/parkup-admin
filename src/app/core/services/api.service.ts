import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParkingZone } from '../models/parking-zone.model';
import { Street, CreateStreetDto } from '../models/street.model';
import { Agent, CreateAgentDto, UpdateAgentDto } from '../models/agent.model';
import { Ticket, TicketStatus } from '../models/ticket.model';
import {
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionReason,
} from '../models/wallet.model';
import {
  ParkingSession,
  ParkingSessionStatus,
  CreateParkingSessionDto,
  UpdateParkingSessionDto,
  ExtendParkingSessionDto,
} from '../models/parking-session.model';

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
    plateLeft?: string;
    plateRight?: string;
    plateType?: string;
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
    if (params?.plateLeft) {
      httpParams = httpParams.set('plateLeft', params.plateLeft);
    }
    if (params?.plateRight) {
      httpParams = httpParams.set('plateRight', params.plateRight);
    }
    if (params?.plateType) {
      httpParams = httpParams.set('plateType', params.plateType);
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

  payTicket(
    id: string,
    paymentMethod: string
  ): Observable<{ data: Ticket; success: boolean }> {
    return this.http.patch<{ data: Ticket; success: boolean }>(
      `${this.apiUrl}/tickets/${id}/pay`,
      { paymentMethod }
    );
  }

  deleteTicket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tickets/${id}`);
  }

  generateTicketToken(id: string): Observable<{
    success: boolean;
    data: {
      token: string;
      qrCodeDataUrl: string;
      qrCodeContent: string;
      expiresAt: string;
    };
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        token: string;
        qrCodeDataUrl: string;
        qrCodeContent: string;
        expiresAt: string;
      };
    }>(`${this.apiUrl}/tickets/${id}/token`, {});
  }

  // ==================== WALLETS ====================

  getWallets(params?: {
    limit?: number;
    skip?: number;
  }): Observable<{
    data: Wallet[];
    success: boolean;
    count: number;
    total: number;
  }> {
    let httpParams = new HttpParams();
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    return this.http.get<{
      data: Wallet[];
      success: boolean;
      count: number;
      total: number;
    }>(`${this.apiUrl}/wallets`, { params: httpParams });
  }

  getWalletByUser(
    userId: string
  ): Observable<{ data: Wallet; success: boolean }> {
    return this.http.get<{ data: Wallet; success: boolean }>(
      `${this.apiUrl}/wallets/user/${userId}`
    );
  }

  getWalletTransactions(params?: {
    limit?: number;
    skip?: number;
    userId?: string;
    type?: TransactionType;
    reason?: TransactionReason;
  }): Observable<{
    data: WalletTransaction[];
    success: boolean;
    count: number;
    total: number;
  }> {
    let httpParams = new HttpParams();
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    if (params?.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }
    if (params?.reason) {
      httpParams = httpParams.set('reason', params.reason);
    }
    return this.http.get<{
      data: WalletTransaction[];
      success: boolean;
      count: number;
      total: number;
    }>(`${this.apiUrl}/wallets/transactions`, { params: httpParams });
  }

  getUserWalletTransactions(
    userId: string,
    params?: { limit?: number; skip?: number }
  ): Observable<{
    data: WalletTransaction[];
    success: boolean;
    count: number;
  }> {
    let httpParams = new HttpParams();
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    return this.http.get<{
      data: WalletTransaction[];
      success: boolean;
      count: number;
    }>(`${this.apiUrl}/wallets/user/${userId}/transactions`, {
      params: httpParams,
    });
  }

  creditUserWallet(
    userId: string,
    amount: number,
    reason?: TransactionReason
  ): Observable<{ data: any; success: boolean }> {
    return this.http.post<{ data: any; success: boolean }>(
      `${this.apiUrl}/wallets/user/${userId}/credit`,
      { amount, reason }
    );
  }

  rebuildUserWallet(
    userId: string
  ): Observable<{ data: any; success: boolean; message: string }> {
    return this.http.post<{ data: any; success: boolean; message: string }>(
      `${this.apiUrl}/wallets/user/${userId}/rebuild`,
      {}
    );
  }

  // ==================== PARKING SESSIONS ====================

  getParkingSessions(params?: {
    userId?: string;
    zoneId?: string;
    status?: ParkingSessionStatus;
    licensePlate?: string;
    limit?: number;
    skip?: number;
  }): Observable<{ data: ParkingSession[]; success: boolean; count: number }> {
    let httpParams = new HttpParams();
    if (params?.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }
    if (params?.zoneId) {
      httpParams = httpParams.set('zoneId', params.zoneId);
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
    return this.http.get<{
      data: ParkingSession[];
      success: boolean;
      count: number;
    }>(`${this.apiUrl}/parking-sessions`, { params: httpParams });
  }

  getParkingSession(
    id: string
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.get<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions/${id}`
    );
  }

  getParkingSessionsByUser(
    userId: string,
    params?: { status?: ParkingSessionStatus; limit?: number }
  ): Observable<{ data: ParkingSession[]; success: boolean; count: number }> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<{
      data: ParkingSession[];
      success: boolean;
      count: number;
    }>(`${this.apiUrl}/parking-sessions/user/${userId}`, { params: httpParams });
  }

  getActiveSessionByUser(
    userId: string
  ): Observable<{ data: ParkingSession | null; success: boolean }> {
    return this.http.get<{ data: ParkingSession | null; success: boolean }>(
      `${this.apiUrl}/parking-sessions/user/${userId}/active`
    );
  }

  getActiveSessionsByPlate(
    licensePlate: string
  ): Observable<{ data: ParkingSession[]; success: boolean; count: number }> {
    return this.http.get<{
      data: ParkingSession[];
      success: boolean;
      count: number;
    }>(`${this.apiUrl}/parking-sessions/plate/${encodeURIComponent(licensePlate)}/active`);
  }

  getUserSessionHistory(
    userId: string,
    params?: { limit?: number; skip?: number }
  ): Observable<{ data: ParkingSession[]; success: boolean; count: number }> {
    let httpParams = new HttpParams();
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.skip) {
      httpParams = httpParams.set('skip', params.skip.toString());
    }
    return this.http.get<{
      data: ParkingSession[];
      success: boolean;
      count: number;
    }>(`${this.apiUrl}/parking-sessions/user/${userId}/history`, {
      params: httpParams,
    });
  }

  createParkingSession(
    session: CreateParkingSessionDto
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.post<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions`,
      session
    );
  }

  updateParkingSession(
    id: string,
    session: UpdateParkingSessionDto
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.put<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions/${id}`,
      session
    );
  }

  extendParkingSession(
    id: string,
    extension: ExtendParkingSessionDto
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.patch<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions/${id}/extend`,
      extension
    );
  }

  endParkingSession(
    id: string
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.patch<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions/${id}/end`,
      {}
    );
  }

  cancelParkingSession(
    id: string
  ): Observable<{ data: ParkingSession; success: boolean }> {
    return this.http.patch<{ data: ParkingSession; success: boolean }>(
      `${this.apiUrl}/parking-sessions/${id}/cancel`,
      {}
    );
  }

  deleteParkingSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/parking-sessions/${id}`);
  }

  updateExpiredSessions(): Observable<{
    success: boolean;
    count: number;
    message: string;
  }> {
    return this.http.post<{ success: boolean; count: number; message: string }>(
      `${this.apiUrl}/parking-sessions/admin/update-expired`,
      {}
    );
  }
}
