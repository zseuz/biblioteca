import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Límites de los formularios. Deben coincidir con las anotaciones {@code @Size}, {@code @Min} y
 * {@code @Max} de los DTO del backend ({@code BookRequest} y {@code MemberRequest}), que son la
 * garantía definitiva.
 */
export const LIMITS = {
  title: { min: 2, max: 200 },
  author: { min: 3, max: 150 },
  genre: { min: 3, max: 80 },
  copies: { min: 1, max: 1000 },
  memberName: { min: 1, max: 100 }, // 1 o 2 caracteres se permiten con aviso (ver member-name.ts)
  email: { min: 6, max: 150 },
} as const;

/**
 * Validador: rechaza valores formados solo por espacios. {@code Validators.required} los da
 * por buenos, pero el backend ({@code @NotBlank}) no, así que se valida igual en ambos lados.
 */
export function notBlank(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value ?? '';
  return value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
}

/**
 * Validador de longitud sobre el texto <b>sin espacios al inicio ni al final</b> (igual que lo
 * guarda el backend). Devuelve los mismos errores que Angular ({@code minlength} /
 * {@code maxlength}) con la longitud real, para poder decir «tiene 900». Un campo vacío no da
 * error aquí: de eso se encargan {@code required} y {@link notBlank}.
 */
export function textLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const length = (control.value ?? '').trim().length;
    if (length === 0) return null;
    if (length < min) return { minlength: { requiredLength: min, actualLength: length } };
    if (length > max) return { maxlength: { requiredLength: max, actualLength: length } };
    return null;
  };
}

/** Validador: solo números enteros (rechaza 1.5). */
export function integer(control: AbstractControl<number | string | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null;
  return Number.isInteger(Number(value)) ? null : { integer: true };
}

/**
 * Mensaje para el primer error de un campo, con la longitud o el límite exactos.
 *
 * @param field  cómo se nombra el campo en la frase, con artículo: «El título», «El correo»
 * @param errors errores del control ({@code control.errors})
 */
export function validationMessage(field: string, errors: ValidationErrors | null): string {
  if (!errors) return '';
  if (errors['required'] || errors['blank']) return `${field} es obligatorio.`;
  if (errors['minlength']) {
    const { requiredLength, actualLength } = errors['minlength'];
    return `${field} debe tener al menos ${requiredLength} caracteres (tiene ${actualLength}).`;
  }
  if (errors['maxlength']) {
    const { requiredLength, actualLength } = errors['maxlength'];
    return `${field} no puede superar los ${requiredLength} caracteres (tiene ${actualLength}).`;
  }
  if (errors['email']) return 'Ingresa un correo válido, por ejemplo nombre@dominio.com.';
  if (errors['integer']) return `${field} debe ser un número entero.`;
  if (errors['min']) return `${field} debe ser al menos ${errors['min'].min}.`;
  if (errors['max']) return `${field} no puede ser mayor que ${errors['max'].max}.`;
  return `${field} no es válido.`;
}
