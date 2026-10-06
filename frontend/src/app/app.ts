import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotifyService } from './core/notify.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>
    <header>
      <span class="brand">📚 Biblioteca</span>
      <nav aria-label="Principal">
        <a routerLink="/libros" routerLinkActive="active">Libros</a>
        <a routerLink="/usuarios" routerLinkActive="active">Usuarios</a>
        <a routerLink="/prestamos" routerLinkActive="active">Préstamos</a>
        <a routerLink="/estadisticas" routerLinkActive="active">Estadísticas</a>
      </nav>
    </header>

    <div class="toast-area" aria-live="polite" role="status">
      @if (notify.notice(); as n) {
        <div class="toast" [class.err]="n.kind === 'error'">
          <span>{{ n.text }}</span>
          <button type="button" (click)="notify.clear()" aria-label="Cerrar mensaje">✕</button>
        </div>
      }
    </div>

    <main id="contenido" tabindex="-1"><router-outlet /></main>
  `,
  styles: `
    header { background: #0f172a; color: #fff; display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1.5rem; padding: .75rem 1rem; }
    .brand { font-weight: 700; font-size: 1.1rem; }
    nav { display: flex; flex-wrap: wrap; gap: .25rem; }
    nav a { color: #e2e8f0; text-decoration: none; padding: .35rem .75rem; border-radius: 6px; }
    nav a:hover { background: #1e293b; }
    nav a.active { background: #fff; color: #0f172a; font-weight: 600; }
    main { max-width: 1000px; margin: 0 auto; padding: 1rem; }
    .skip { position: absolute; left: -999px; background: #fff; padding: .5rem; z-index: 10; }
    .skip:focus { left: .5rem; top: .5rem; }
    .toast-area { position: sticky; top: 0; z-index: 5; display: flex; justify-content: center; padding: 0 1rem; }
    .toast { margin-top: .5rem; display: flex; gap: 1rem; align-items: center; background: #ecfdf3; color: #067647; border: 1px solid #067647; border-radius: 8px; padding: .5rem .75rem; max-width: 900px; }
    .toast.err { background: #fef3f2; color: #b42318; border-color: #b42318; }
    .toast button { border: 0; background: transparent; color: inherit; padding: 0 .25rem; }
  `,
})
export class App {
  protected readonly notify = inject(NotifyService);
}
