import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { forkJoin } from 'rxjs';

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalTickets: number;
  pendingTickets: number;
  paidTickets: number;
  overdueTickets: number;
  totalZones: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home">
      <header class="page-header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble de ParkUp</p>
      </header>

      @if (isLoading) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      } @else {
        <div class="stats-grid">
          <!-- Agents Stats -->
          <div class="stat-card">
            <div class="stat-icon agents">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalAgents }}</span>
              <span class="stat-label">Agents Total</span>
            </div>
            <div class="stat-footer">
              <span class="stat-sub">{{ stats.activeAgents }} actifs</span>
            </div>
          </div>

          <!-- Tickets Stats -->
          <div class="stat-card">
            <div class="stat-icon tickets">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalTickets }}</span>
              <span class="stat-label">Tickets Total</span>
            </div>
            <div class="stat-footer">
              <span class="stat-sub pending">{{ stats.pendingTickets }} en attente</span>
            </div>
          </div>

          <!-- Paid Tickets -->
          <div class="stat-card">
            <div class="stat-icon paid">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.paidTickets }}</span>
              <span class="stat-label">Tickets Payés</span>
            </div>
            <div class="stat-footer">
              <span class="stat-sub success">Résolus</span>
            </div>
          </div>

          <!-- Overdue Tickets -->
          <div class="stat-card">
            <div class="stat-icon overdue">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.overdueTickets }}</span>
              <span class="stat-label">Tickets en Retard</span>
            </div>
            <div class="stat-footer">
              <span class="stat-sub danger">Impayés</span>
            </div>
          </div>

          <!-- Zones -->
          <div class="stat-card">
            <div class="stat-icon zones">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalZones }}</span>
              <span class="stat-label">Zones</span>
            </div>
            <div class="stat-footer">
              <span class="stat-sub">Zones de stationnement</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--spacing-xl);
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--app-text-primary);
    }

    .page-header p {
      margin: var(--spacing-sm) 0 0;
      color: var(--app-text-secondary);
      font-size: 0.875rem;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: var(--app-text-secondary);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--app-border);
      border-top-color: var(--color-secondary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--spacing-md);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    .stat-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon.agents {
      background: rgba(37, 99, 235, 0.1);
      color: var(--color-secondary);
    }

    .stat-icon.tickets {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }

    .stat-icon.paid {
      background: rgba(34, 197, 94, 0.1);
      color: var(--color-success);
    }

    .stat-icon.overdue {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
    }

    .stat-icon.zones {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--app-text-primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--app-text-secondary);
    }

    .stat-footer {
      border-top: 1px solid var(--app-border);
      padding-top: var(--spacing-md);
      margin-top: auto;
    }

    .stat-sub {
      font-size: 0.75rem;
      color: var(--app-text-secondary);
    }

    .stat-sub.pending {
      color: var(--color-warning);
    }

    .stat-sub.success {
      color: var(--color-success);
    }

    .stat-sub.danger {
      color: var(--color-error);
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  isLoading = true;
  stats: DashboardStats = {
    totalAgents: 0,
    activeAgents: 0,
    totalTickets: 0,
    pendingTickets: 0,
    paidTickets: 0,
    overdueTickets: 0,
    totalZones: 0,
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;

    forkJoin({
      agents: this.apiService.getAgents(),
      activeAgents: this.apiService.getAgents({ isActive: true }),
      tickets: this.apiService.getTickets(),
      pendingTickets: this.apiService.getTickets({ status: 'PENDING' as any }),
      paidTickets: this.apiService.getTickets({ status: 'PAID' as any }),
      overdueTickets: this.apiService.getTickets({ status: 'OVERDUE' as any }),
      zones: this.apiService.getParkingZones(),
    }).subscribe({
      next: (results) => {
        this.stats = {
          totalAgents: results.agents.count,
          activeAgents: results.activeAgents.count,
          totalTickets: results.tickets.count,
          pendingTickets: results.pendingTickets.count,
          paidTickets: results.paidTickets.count,
          overdueTickets: results.overdueTickets.count,
          totalZones: results.zones.count,
        };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.isLoading = false;
      },
    });
  }
}
