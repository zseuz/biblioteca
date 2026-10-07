import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'biblioteca_theme_preference';
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

  toggleTheme(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

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
