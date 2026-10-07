import { Injectable, signal } from '@angular/core';

/** Tipos de aviso: éxito, error, información o advertencia (cambian el color y el icono). */
export type NoticeKind = 'ok' | 'error' | 'info' | 'warn';

/** Un aviso que se muestra arriba a la derecha. */
export interface Notice {
  kind: 'ok' | 'error' | 'info' | 'warn';
  text: string;
}

/**
 * Avisos flotantes de toda la app (el «toast»). Las pantallas llaman a ok(), error()…;
 * el componente principal (app.ts) lee {@link notice} y lo pinta. Desaparece solo a los 5 segundos.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  /** Aviso visible ahora mismo (null = ninguno). Es una signal: la vista se actualiza sola. */
  readonly notice = signal<Notice | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  /** Aviso verde de operación correcta, p. ej. «Libro agregado». */
  ok(text: string): void {
    this.show({ kind: 'ok', text });
  }

  /** Aviso rojo de error (lo usa el interceptor con el mensaje del backend). */
  error(text: string): void {
    this.show({ kind: 'error', text });
  }

  /** Aviso informativo. */
  info(text: string): void {
    this.show({ kind: 'info', text });
  }

  /** Aviso de advertencia. */
  warn(text: string): void {
    this.show({ kind: 'warn', text });
  }

  /** Cierra el aviso actual (botón ×) y cancela su temporizador. */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.notice.set(null);
  }

  /** Muestra un aviso y programa su cierre a los 5 s; uno nuevo reemplaza al anterior. */
  private show(notice: Notice): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.notice.set({ kind: notice.kind, text: notice.text });
    this.timer = setTimeout(() => {
      this.notice.set(null);
      this.timer = undefined;
    }, 5000);
  }
}
