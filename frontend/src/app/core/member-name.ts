import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Longitud máxima del nombre. Debe coincidir con {@code MemberRequest.NAME_MAX} del backend. */
export const NAME_MAX = 100;

/**
 * Validador: rechaza valores formados solo por espacios. {@code Validators.required} los da
 * por buenos, pero el backend ({@code @NotBlank}) no, así que se valida igual en ambos lados.
 */
export function notBlank(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value ?? '';
  return value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
}

/**
 * Avisos (no errores) sobre un nombre que probablemente esté mal escrito. No impiden guardar:
 * hay nombres legítimos con números o de una sola letra, así que se pide confirmación.
 */
export function nameWarnings(rawName: string | null | undefined): string[] {
  const name = (rawName ?? '').trim();
  const warnings: string[] = [];
  if (name.length === 1) {
    warnings.push(/\d/.test(name) ? 'El nombre es solo un número.' : 'El nombre tiene una sola letra.');
  } else if (/\d/.test(name)) {
    warnings.push('El nombre contiene números.');
  }
  return warnings;
}
