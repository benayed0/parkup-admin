import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./features/agents/agents.component').then(
            (m) => m.AgentsComponent
          ),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/tickets.component').then(
            (m) => m.TicketsComponent
          ),
      },
      {
        path: 'streets',
        loadComponent: () =>
          import('./features/streets-editor/streets-editor.component').then(
            (m) => m.StreetsEditorComponent
          ),
      },
      {
        path: 'operators',
        loadComponent: () =>
          import('./features/operators/operators.component').then(
            (m) => m.OperatorsComponent
          ),
      },
      {
        path: 'wallets',
        loadComponent: () =>
          import('./features/wallets/wallets.component').then(
            (m) => m.WalletsComponent
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/parking-sessions/parking-sessions.component').then(
            (m) => m.ParkingSessionsComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
