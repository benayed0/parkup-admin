import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'streets',
    pathMatch: 'full',
  },
  {
    path: 'streets',
    loadComponent: () =>
      import('./features/streets-editor/streets-editor.component').then(
        (m) => m.StreetsEditorComponent
      ),
  },
];
