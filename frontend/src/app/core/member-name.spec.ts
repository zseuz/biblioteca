import { FormControl } from '@angular/forms';
import { nameWarnings, notBlank } from './member-name';

describe('member-name', () => {
  describe('nameWarnings', () => {
    it('no avisa con un nombre normal', () => {
      expect(nameWarnings('Ana García')).toEqual([]);
      expect(nameWarnings('  Luis  ')).toEqual([]);
    });

    it('avisa si el nombre contiene números', () => {
      expect(nameWarnings('Juan Pablo 2')).toEqual(['El nombre contiene números.']);
    });

    it('avisa si el nombre es una sola letra o un solo número', () => {
      expect(nameWarnings('A')).toEqual(['El nombre tiene una sola letra.']);
      expect(nameWarnings(' 7 ')).toEqual(['El nombre es solo un número.']);
    });

    it('no avisa con un campo vacío (eso es un error, no un aviso)', () => {
      expect(nameWarnings('')).toEqual([]);
      expect(nameWarnings(null)).toEqual([]);
    });
  });

  describe('notBlank', () => {
    it('rechaza un valor de solo espacios y acepta texto real', () => {
      expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
      expect(notBlank(new FormControl('Ana'))).toBeNull();
      expect(notBlank(new FormControl(''))).toBeNull(); // el vacío lo cubre "required"
    });
  });
});
