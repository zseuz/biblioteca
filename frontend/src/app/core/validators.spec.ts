import { FormControl } from '@angular/forms';
import { integer, notBlank, textLength, validationMessage } from './validators';

/** Validadores de los formularios (longitud sin espacios, enteros) y sus mensajes de error. */
describe('validators', () => {
  describe('textLength', () => {
    const v = textLength(3, 5);

    it('cuenta sin los espacios del inicio y del final', () => {
      expect(v(new FormControl('  ab  '))).toEqual({ minlength: { requiredLength: 3, actualLength: 2 } });
      expect(v(new FormControl('  abc  '))).toBeNull();
    });

    it('marca el exceso con la longitud real', () => {
      expect(v(new FormControl('abcdef'))).toEqual({ maxlength: { requiredLength: 5, actualLength: 6 } });
    });

    it('no opina sobre un campo vacío (eso lo hacen required y notBlank)', () => {
      expect(v(new FormControl(''))).toBeNull();
      expect(v(new FormControl(null))).toBeNull();
    });
  });

  it('integer rechaza decimales y acepta enteros', () => {
    expect(integer(new FormControl(1.5))).toEqual({ integer: true });
    expect(integer(new FormControl(3))).toBeNull();
  });

  it('notBlank rechaza solo espacios', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlank(new FormControl('a'))).toBeNull();
  });

  it('validationMessage da un mensaje por cada tipo de error', () => {
    expect(validationMessage('El título', { required: true })).toBe('El título es obligatorio.');
    expect(validationMessage('El título', { maxlength: { requiredLength: 200, actualLength: 900 } })).toBe(
      'El título no puede superar los 200 caracteres (tiene 900).',
    );
    expect(validationMessage('El autor', { minlength: { requiredLength: 3, actualLength: 2 } })).toBe(
      'El autor debe tener al menos 3 caracteres (tiene 2).',
    );
    expect(validationMessage('El número de ejemplares', { max: { max: 1000 } })).toBe(
      'El número de ejemplares no puede ser mayor que 1000.',
    );
    expect(validationMessage('El campo', null)).toBe('');
  });
});
