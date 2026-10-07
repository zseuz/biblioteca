import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotifyService } from './core/notify.service';
import { ThemeService } from './core/theme.service';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <header class="app-header">
      <div class="header-inner">
        <div class="brand-group">
          <div class="brand-logo">
            <app-icon name="book-open" [size]="20" />
          </div>
          <span class="brand-title">Biblioteca</span>
          <span class="brand-badge">Sistema</span>
        </div>

        <nav class="main-nav" aria-label="Principal">
          <a routerLink="/libros" routerLinkActive="active">
            <app-icon name="book" [size]="16" />Libros
          </a>
          <a routerLink="/usuarios" routerLinkActive="active">
            <app-icon name="users" [size]="16" />Usuarios
          </a>
          <a routerLink="/prestamos" routerLinkActive="active">
            <app-icon name="loans" [size]="16" />Préstamos
          </a>
          <a routerLink="/estadisticas" routerLinkActive="active">
            <app-icon name="chart" [size]="16" />Estadísticas
          </a>
        </nav>

        <div class="header-actions">
          <button
            type="button"
            class="theme-toggle-btn"
            (click)="themeService.toggleTheme()"
            [attr.aria-label]="
              themeService.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
            "
            [title]="themeService.theme() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
          >
            <app-icon [name]="themeService.theme() === 'dark' ? 'sun' : 'moon'" [size]="18" />
          </button>
        </div>
      </div>
    </header>

    <div class="toast-viewport" aria-live="polite" role="status">
      @if (notify.notice(); as n) {
        <div
          class="toast-item"
          [class.toast-err]="n.kind === 'error'"
          [class.toast-ok]="n.kind === 'ok'"
        >
          <div class="toast-icon">
            <app-icon [name]="n.kind === 'error' ? 'alert' : 'check'" [size]="18" />
          </div>
          <div class="toast-body">
            <span class="toast-text">{{ n.text }}</span>
          </div>
          <button
            type="button"
            class="toast-close"
            (click)="notify.clear()"
            aria-label="Cerrar notificación"
          >
            <app-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>

    <main id="contenido" class="app-main" tabindex="-1">
      <router-outlet />
    </main>

    <footer class="app-footer">
      <div class="footer-inner">
        <span>Sistema de Gestión de Biblioteca</span>
        <span class="footer-separator">·</span>
        <span>Angular 22 & Spring Boot 4</span>
      </div>
    </footer>
  `,
  styles: `
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 0.5rem;
      background: var(--primary);
      color: var(--primary-text);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      z-index: 1000;
      text-decoration: none;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
    }
    .skip-link:focus {
      left: 1rem;
    }

    .app-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .brand-logo {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
    }

    .brand-title {
      font-weight: 800;
      font-size: 1.15rem;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .brand-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.45rem;
      background: var(--surface-subtle);
      color: var(--muted);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .main-nav {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      overflow-x: auto;
      padding: 0.15rem;
    }

    .main-nav a {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--muted);
      text-decoration: none;
      padding: 0.45rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.18s ease;
      white-space: nowrap;
    }

    .main-nav a:hover {
      color: var(--text);
      background: var(--surface-subtle);
    }

    .main-nav a.active {
      color: var(--primary);
      background: var(--primary-light);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .theme-toggle-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .theme-toggle-btn:hover {
      background: var(--surface-subtle);
      border-color: var(--border-strong);
    }

    .toast-viewport {
      position: fixed;
      top: 4.5rem;
      right: 1.25rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
      max-width: 420px;
      width: calc(100% - 2.5rem);
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast-ok {
      border-left: 4px solid var(--ok);
    }

    .toast-ok .toast-icon {
      color: var(--ok);
      background: var(--success-light);
    }

    .toast-err {
      border-left: 4px solid var(--danger);
    }

    .toast-err .toast-icon {
      color: var(--danger);
      background: var(--danger-light);
    }

    .toast-icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast-body {
      flex: 1;
      font-size: 0.88rem;
      font-weight: 500;
      line-height: 1.4;
    }

    .toast-close {
      border: 0;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-close:hover {
      color: var(--text);
      background: var(--hover);
    }

    /* Footer siempre abajo: alto mínimo de ventana y el main crece (dvh = móviles). */
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    .app-main {
      flex: 1 0 auto;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.75rem 1.25rem 3rem;
      outline: none;
    }

    .app-footer {
      border-top: 1px solid var(--border);
      background: var(--surface);
      padding: 1.25rem;
      color: var(--muted);
      font-size: 0.8rem;
      text-align: center;
    }

    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .footer-separator {
      opacity: 0.5;
    }

    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .header-inner {
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
      }
      /* Navegación en una fila de 4 pestañas iguales (icono sobre texto) que siempre cabe. */
      .main-nav {
        order: 3;
        width: 100%;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
      }
      .main-nav a {
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.45rem 0.25rem;
        font-size: 0.72rem;
      }
      .brand-badge {
        display: none;
      }
    }
  `,
})
export class App {
  protected readonly notify = inject(NotifyService);
  protected readonly themeService = inject(ThemeService);
}
