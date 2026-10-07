/**
 * Configuración de producción (build que se publica en Vercel).
 *
 * apiUrl apunta al backend publicado en Render. Si el servicio de Render recibe otra URL
 * (por ejemplo, porque el nombre ya estaba ocupado), cámbiala aquí.
 */
export const environment = {
  production: true,
  apiUrl: 'https://biblioteca-api.onrender.com/api',
};
