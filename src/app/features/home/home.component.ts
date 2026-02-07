import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { combineLatest, forkJoin, Subject, takeUntil } from 'rxjs';

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

  constructor(
    private apiService: ApiService,
    private dataStore: DataStoreService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.isLoading = true;

    // Load agents and zones from the store
    this.dataStore.loadAgents();
    this.dataStore.loadZones();

    // Ticket stats still need server-side filtering
    forkJoin({
      tickets: this.apiService.getTickets(),
      pendingTickets: this.apiService.getTickets({ status: 'PENDING' as any }),
      paidTickets: this.apiService.getTickets({ status: 'PAID' as any }),
      overdueTickets: this.apiService.getTickets({ status: 'OVERDUE' as any }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.stats.totalTickets = results.tickets.count;
        this.stats.pendingTickets = results.pendingTickets.count;
        this.stats.paidTickets = results.paidTickets.count;
        this.stats.overdueTickets = results.overdueTickets.count;
      },
      error: (err) => {
        console.error('Error loading ticket stats:', err);
      },
    });

    // Agent + zone counts from store
    combineLatest([this.dataStore.agents$, this.dataStore.zones$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([agents, zones]) => {
        this.stats.totalAgents = agents.length;
        this.stats.activeAgents = agents.filter((a) => a.isActive).length;
        this.stats.totalZones = zones.length;
        this.isLoading = false;
      });
  }
}
