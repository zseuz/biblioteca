import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación. Cada pantalla se carga de forma diferida (loadComponent): su código
 * se descarga solo la primera vez que se entra en ella. «title» cambia el título de la pestaña.
 * La ruta vacía y cualquier ruta desconocida (**) llevan a Libros.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'libros' },
  {
    path: 'libros',
    title: 'Libros · Biblioteca',
    loadComponent: () => import('./pages/books.page').then((m) => m.BooksPage),
  },
  {
    path: 'usuarios',
    title: 'Usuarios · Biblioteca',
    loadComponent: () => import('./pages/members.page').then((m) => m.MembersPage),
  },
  {
    path: 'prestamos',
    title: 'Préstamos · Biblioteca',
    loadComponent: () => import('./pages/loans.page').then((m) => m.LoansPage),
  },
  {
    path: 'estadisticas',
    title: 'Estadísticas · Biblioteca',
    loadComponent: () => import('./pages/stats.page').then((m) => m.StatsPage),
  },
  { path: '**', redirectTo: 'libros' },
];
