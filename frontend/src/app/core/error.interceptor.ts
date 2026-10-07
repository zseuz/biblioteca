import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotifyService } from './notify.service';

/** Convierte cualquier error HTTP en un mensaje legible para el usuario. */
export function messageFor(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. ¿Está la API encendida?';
  }
  const body = err.error as { message?: string; fields?: Record<string, string> } | null;
  if (body?.fields) {
    return Object.entries(body.fields)
      .map(([f, m]) => `${f}: ${m}`)
      .join(' · ');
  }
  return body?.message ?? `Error inesperado (${err.status})`;
}

/**
 * Marca una petición cuyo error se mostrará en su propio contexto (p. ej. dentro de un
 * diálogo), para no duplicarlo con el aviso global.
 */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!req.context.get(SILENT_ERRORS)) {
        notify.error(messageFor(err));
      }
      return throwError(() => err);
    }),
  );
};
