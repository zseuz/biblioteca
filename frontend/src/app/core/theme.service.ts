import { Injectable, effect, signal } from '@angular/core';

/** Tema visual: claro u oscuro. */
export type ThemeMode = 'light' | 'dark';

/**
 * Modo claro/oscuro. Pone {@code data-theme} en la etiqueta <html> (los colores de styles.css
 * cambian según ese atributo) y recuerda la elección del usuario en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Clave con la que se guarda la preferencia en localStorage. */
  private readonly storageKey = 'biblioteca_theme_preference';
  /** Tema actual. Al cambiar, el effect del constructor lo aplica y lo guarda. */
  readonly theme = signal<ThemeMode>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      document.documentElement.setAttribute('data-theme', current);
      try {
        localStorage.setItem(this.storageKey, current);
      } catch {
        // Ignora errores si el almacenamiento está restringido
      }
    });

    // Escucha cambios en el sistema operativo si no se ha configurado explícitamente
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.theme.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /** Alterna entre claro y oscuro (botón de la luna/sol en la cabecera). */
  toggleTheme(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  /** Tema al abrir la app: el guardado por el usuario o, si no hay, el del sistema operativo. */
  private getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Ignora errores
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
