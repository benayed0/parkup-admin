import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout">
      <nav class="navbar">
        <div class="nav-brand">
          <a routerLink="/">
            <img src="assets/parkup-logo.png" alt="ParkUp" class="logo" />
            <span>Admin</span>
          </a>
        </div>
        <ul class="nav-links">
          <li>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Accueil</span>
            </a>
          </li>
          <li>
            <a routerLink="/agents" routerLinkActive="active">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Agents</span>
            </a>
          </li>
          <li>
            <a routerLink="/sessions" routerLinkActive="active">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Sessions</span>
            </a>
          </li>
          <li>
            <a routerLink="/tickets" routerLinkActive="active">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Tickets</span>
            </a>
          </li>
          <li>
            <a routerLink="/streets" routerLinkActive="active">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>Rues</span>
            </a>
          </li>
          @if (isSuperAdmin) {
            <li>
              <a routerLink="/wallets" routerLinkActive="active">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                <span>Portefeuilles</span>
              </a>
            </li>
          }
          @if (canViewOperators) {
            <li>
              <a routerLink="/operators" routerLinkActive="active">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>
                </svg>
                <span>Operateurs</span>
              </a>
            </li>
          }
        </ul>
        <div class="nav-user">
          @if (authService.currentOperator$ | async; as operator) {
            <span class="user-email">{{ operator.email }}</span>
          }
          <button class="logout-btn" (click)="logout()" title="Deconnexion">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Deconnexion</span>
          </button>
        </div>
      </nav>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      min-height: 100vh;
      background: var(--app-background);
    }

    .navbar {
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-border);
      padding: 0 var(--spacing-lg);
      display: flex;
      align-items: center;
      height: 64px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .nav-brand a {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      text-decoration: none;
    }

    .nav-brand .logo {
      height: 36px;
      width: auto;
    }

    .nav-brand span {
      color: var(--app-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      padding: 4px 8px;
      background: var(--app-surface-variant);
      border-radius: var(--radius-sm);
    }

    .nav-links {
      display: flex;
      list-style: none;
      margin: 0 0 0 48px;
      padding: 0;
      gap: var(--spacing-sm);
    }

    .nav-links a {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 10px var(--spacing-md);
      color: var(--app-text-secondary);
      text-decoration: none;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .nav-links a:hover {
      color: var(--app-text-primary);
      background: var(--app-surface-variant);
    }

    .nav-links a.active {
      color: var(--color-secondary);
      background: rgba(37, 99, 235, 0.1);
    }

    .main-content {
      padding: var(--spacing-lg);
      min-height: calc(100vh - 64px);
    }

    .nav-user {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .user-email {
      font-size: 0.875rem;
      color: var(--app-text-secondary);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 8px var(--spacing-md);
      background: transparent;
      border: 1px solid var(--app-border);
      border-radius: var(--radius-sm);
      color: var(--app-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      color: var(--color-error);
      border-color: var(--color-error);
      background: rgba(239, 68, 68, 0.05);
    }

    @media (max-width: 768px) {
      .navbar {
        padding: 0 var(--spacing-md);
      }

      .nav-brand span {
        display: none;
      }

      .nav-links {
        gap: var(--spacing-xs);
      }

      .nav-links span {
        display: none;
      }

      .nav-links a {
        padding: 10px;
      }

      .main-content {
        padding: var(--spacing-md);
      }

      .user-email {
        display: none;
      }

      .logout-btn span {
        display: none;
      }

      .logout-btn {
        padding: 8px;
      }
    }
  `]
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
