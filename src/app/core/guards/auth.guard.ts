import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Check if token exists and operator profile was loaded
    if (this.authService.isAuthenticated && this.authService.currentOperator) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
