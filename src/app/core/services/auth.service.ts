import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Operator } from '../models/operator.model';

interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    operator: Operator;
  };
}

interface ProfileResponse {
  success: boolean;
  data: Operator;
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

  private currentOperatorSubject = new BehaviorSubject<Operator | null>(null);
  public currentOperator$ = this.currentOperatorSubject.asObservable();

  private initialized = false;

  constructor(private http: HttpClient) {}

  /**
   * Initialize auth state by fetching profile if token exists
   * Should be called on app startup
   */
  initialize(): Observable<Operator | null> {
    if (this.initialized) {
      return of(this.currentOperatorSubject.value);
    }

    const token = this.getToken();
    if (!token) {
      this.initialized = true;
      return of(null);
    }

    return this.fetchProfile().pipe(
      tap(() => {
        this.initialized = true;
      }),
      catchError(() => {
        this.logout();
        this.initialized = true;
        return of(null);
      })
    );
  }

  /**
   * Fetch the current operator's profile from the API
   */
  fetchProfile(): Observable<Operator | null> {
    return this.http.get<ProfileResponse>(`${this.API_URL}/operators/me`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentOperatorSubject.next(response.data);
        }
      }),
      switchMap((response) => of(response.data)),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
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
            // Only store the token, not the user info
            localStorage.setItem(this.TOKEN_KEY, response.data.accessToken);
            this.currentOperatorSubject.next(response.data.operator);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentOperatorSubject.next(null);
  }
}
