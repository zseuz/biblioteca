import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/error.interceptor';

/**
 * Configuración global de la aplicación (main.ts la usa al arrancar):
 * - provideBrowserGlobalErrorListeners: registra los errores no controlados del navegador.
 * - provideRouter: activa la navegación entre pantallas definida en app.routes.ts.
 * - provideHttpClient: habilita las llamadas a la API, todas pasando por el interceptor de errores.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
  ],
};
