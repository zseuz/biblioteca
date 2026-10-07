export { notBlank } from './validators';

/** Longitud máxima del nombre. Debe coincidir con {@code MemberRequest.NAME_MAX} del backend. */
export const NAME_MAX = 100;

/**
 * Avisos (no errores) sobre un nombre que probablemente esté mal escrito. No impiden guardar:
 * hay nombres legítimos con números o muy cortos (1 o 2 caracteres), así que se pide confirmación.
 */
export function nameWarnings(rawName: string | null | undefined): string[] {
  const name = (rawName ?? '').trim();
  const warnings: string[] = [];
  if (name.length === 1) {
    warnings.push(/\d/.test(name) ? 'El nombre es solo un número.' : 'El nombre tiene una sola letra.');
  } else {
    if (name.length === 2) {
      warnings.push('El nombre tiene solo 2 caracteres.');
    }
    if (/\d/.test(name)) {
      warnings.push('El nombre contiene números.');
    }
  }
  return warnings;
}
