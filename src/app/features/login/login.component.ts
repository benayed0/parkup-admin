import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  otp = '';
  otpDigits: string[] = ['', '', '', ''];
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
        this.error = err.error?.message || "Erreur lors de l'envoi du code OTP";
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
    this.otpDigits = ['', '', '', ''];
    this.error = '';
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow numbers
    if (value && !/^[0-9]$/.test(value)) {
      input.value = this.otpDigits[index];
      return;
    }

    this.otpDigits[index] = value;
    this.otp = this.otpDigits.join('');

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement;
      nextInput?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    // Handle backspace - move to previous input
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(
        `otp-${index - 1}`
      ) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const chars = paste
      .replace(/[^0-9]/g, '')
      .slice(0, 4)
      .split('');

    chars.forEach((char, i) => {
      this.otpDigits[i] = char;
    });
    this.otp = this.otpDigits.join('');

    // Focus the next empty input or the last one
    const nextEmptyIndex = this.otpDigits.findIndex((d) => !d);
    const focusIndex = nextEmptyIndex === -1 ? 3 : nextEmptyIndex;
    const input = document.getElementById(
      `otp-${focusIndex}`
    ) as HTMLInputElement;
    input?.focus();
  }
}
