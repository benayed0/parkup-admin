import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { forkJoin, Subject, takeUntil } from 'rxjs';

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
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoading = true;
  private destroy$ = new Subject<void>();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    }).pipe(takeUntil(this.destroy$)).subscribe({
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
