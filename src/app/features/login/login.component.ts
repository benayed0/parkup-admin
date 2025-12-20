import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <img src="assets/parkup-logo.png" alt="ParkUp" class="logo" />
          <h1>Administration</h1>
          <p>Connectez-vous pour acceder au tableau de bord</p>
        </div>

        @if (!otpSent) {
          <!-- Email Form -->
          <form (ngSubmit)="requestOtp()" class="login-form">
            <div class="form-group">
              <label for="email">Adresse email</label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                placeholder="admin@parkup.ma"
                required
                [disabled]="isLoading"
              />
            </div>

            @if (error) {
              <div class="error-message">{{ error }}</div>
            }

            <button type="submit" class="btn btn-primary" [disabled]="isLoading || !email">
              @if (isLoading) {
                <span class="spinner-small"></span>
                Envoi en cours...
              } @else {
                Recevoir le code OTP
              }
            </button>
          </form>
        } @else {
          <!-- OTP Form -->
          <form (ngSubmit)="verifyOtp()" class="login-form">
            <div class="otp-info">
              <p>Un code de verification a ete envoye a</p>
              <strong>{{ email }}</strong>
              <button type="button" class="change-email" (click)="resetForm()">
                Changer d'email
              </button>
            </div>

            <div class="form-group">
              <label for="otp">Code OTP</label>
              <input
                type="text"
                id="otp"
                [(ngModel)]="otp"
                name="otp"
                placeholder="1234"
                maxlength="6"
                required
                [disabled]="isLoading"
                class="otp-input"
              />
            </div>

            @if (error) {
              <div class="error-message">{{ error }}</div>
            }

            <button type="submit" class="btn btn-primary" [disabled]="isLoading || !otp">
              @if (isLoading) {
                <span class="spinner-small"></span>
                Verification...
              } @else {
                Se connecter
              }
            </button>

            <button
              type="button"
              class="btn btn-secondary"
              (click)="requestOtp()"
              [disabled]="isLoading"
            >
              Renvoyer le code
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-background);
      padding: var(--spacing-md);
    }

    .login-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .login-header {
      text-align: center;
      margin-bottom: var(--spacing-xl);
    }

    .logo {
      height: 48px;
      margin-bottom: var(--spacing-md);
    }

    .login-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--app-text-primary);
    }

    .login-header p {
      margin: var(--spacing-sm) 0 0;
      color: var(--app-text-secondary);
      font-size: 0.875rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--app-text-primary);
    }

    .form-group input {
      padding: 12px var(--spacing-md);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      color: var(--app-text-primary);
      font-size: 1rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-group input:disabled {
      background: var(--app-surface-variant);
      cursor: not-allowed;
    }

    .otp-input {
      text-align: center;
      font-size: 1.5rem;
      letter-spacing: 8px;
      font-weight: 600;
    }

    .otp-info {
      text-align: center;
      padding: var(--spacing-md);
      background: var(--app-surface-variant);
      border-radius: var(--radius-sm);
    }

    .otp-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--app-text-secondary);
    }

    .otp-info strong {
      display: block;
      color: var(--app-text-primary);
      margin-top: 4px;
    }

    .change-email {
      background: none;
      border: none;
      color: var(--color-secondary);
      font-size: 0.813rem;
      cursor: pointer;
      margin-top: var(--spacing-sm);
      padding: 0;
    }

    .change-email:hover {
      text-decoration: underline;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: 12px var(--spacing-lg);
      border: none;
      border-radius: var(--radius-sm);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: var(--color-secondary);
      color: var(--color-text-on-primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--app-surface);
      color: var(--app-text-secondary);
      border: 1px solid var(--app-border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--app-surface-variant);
      color: var(--app-text-primary);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      padding: 12px var(--spacing-md);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-sm);
      color: var(--color-error);
      font-size: 0.875rem;
      text-align: center;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoginComponent {
  email = '';
  otp = '';
  otpSent = false;
  isLoading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/']);
    }
  }

  requestOtp(): void {
    if (!this.email) return;

    this.isLoading = true;
    this.error = '';

    this.authService.requestOtp(this.email).subscribe({
      next: () => {
        this.otpSent = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'envoi du code OTP';
        this.isLoading = false;
      },
    });
  }

  verifyOtp(): void {
    if (!this.otp) return;

    this.isLoading = true;
    this.error = '';

    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Code OTP invalide';
        this.isLoading = false;
      },
    });
  }

  resetForm(): void {
    this.otpSent = false;
    this.otp = '';
    this.error = '';
  }
}
