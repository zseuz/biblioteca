import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'libros' },
  { path: 'libros', title: 'Libros · Biblioteca', loadComponent: () => import('./pages/books.page').then(m => m.BooksPage) },
  { path: 'usuarios', title: 'Usuarios · Biblioteca', loadComponent: () => import('./pages/members.page').then(m => m.MembersPage) },
  { path: 'prestamos', title: 'Préstamos · Biblioteca', loadComponent: () => import('./pages/loans.page').then(m => m.LoansPage) },
  { path: 'estadisticas', title: 'Estadísticas · Biblioteca', loadComponent: () => import('./pages/stats.page').then(m => m.StatsPage) },
  { path: '**', redirectTo: 'libros' },
];
