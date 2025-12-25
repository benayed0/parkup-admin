import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  constructor(public authService: AuthService, private router: Router) {}

  get isSuperAdmin(): boolean {
    return this.authService.currentOperator?.role === 'super_admin';
  }

  get canViewOperators(): boolean {
    const operator = this.authService.currentOperator;
    return operator?.role === 'super_admin' || operator?.role === 'admin';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
