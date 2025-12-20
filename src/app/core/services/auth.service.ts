import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Operator } from '../models/operator.model';

interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    operator: Operator;
  };
}

interface OtpResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'parkup_operator_token';
  private readonly OPERATOR_KEY = 'parkup_operator_user';

  private currentOperatorSubject = new BehaviorSubject<Operator | null>(null);
  public currentOperator$ = this.currentOperatorSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredOperator();
  }

  private loadStoredOperator(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const operatorJson = localStorage.getItem(this.OPERATOR_KEY);

    if (token && operatorJson) {
      try {
        const operator = JSON.parse(operatorJson);
        this.currentOperatorSubject.next(operator);
      } catch {
        this.logout();
      }
    }
  }

  get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  get currentOperator(): Operator | null {
    return this.currentOperatorSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  requestOtp(email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.API_URL}/operators/auth/request-otp`, {
      email,
    });
  }

  verifyOtp(email: string, otp: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/operators/auth/verify-otp`, {
        email,
        otp,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            localStorage.setItem(this.TOKEN_KEY, response.data.accessToken);
            localStorage.setItem(this.OPERATOR_KEY, JSON.stringify(response.data.operator));
            this.currentOperatorSubject.next(response.data.operator);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.OPERATOR_KEY);
    this.currentOperatorSubject.next(null);
  }
}
