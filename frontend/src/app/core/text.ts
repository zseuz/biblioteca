/**
 * Normaliza un texto para compararlo o buscarlo: sin mayúsculas, sin tildes ni otras marcas
 * diacríticas y con los espacios sobrantes recortados («  Díaz » → «diaz»). Es el mismo criterio
 * que usa el servidor para sus búsquedas, así que todas las búsquedas de la aplicación se
 * comportan igual.
 */
export function normalizeText(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
