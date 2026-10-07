import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComboboxComponent, ComboboxOption } from './combobox.component';

/** Componente «anfitrión» de prueba: usa el buscador con un FormControl, como un formulario real. */
@Component({
  imports: [ComboboxComponent, ReactiveFormsModule],
  template: `<app-combobox inputId="user" [formControl]="control" [options]="options" />`,
})
class HostComponent {
  readonly control = new FormControl<number | null>(null);
  readonly options: ComboboxOption[] = [
    { value: 1, label: 'Ana Torres', description: 'ana@example.com' },
    { value: 2, label: 'Luis Pérez', description: 'luis@example.com' },
    { value: 3, label: 'María Gómez', description: 'maria@example.com' },
  ];
}

/**
 * Buscador desplegable: abrir, filtrar sin tildes, elegir con teclado o ratón, restaurar al
 * salir y el modo allowCustom (escribir un valor nuevo, como un género).
 */
describe('ComboboxComponent', () => {
  const labels = () =>
    Array.from(document.querySelectorAll('.combo-list .combo-label')).map((e) => e.textContent?.trim());

  /** Monta el anfitrión y devuelve el campo y una función para escribir en él. */
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#user')!;
    const type = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, input, type };
  }

  afterEach(() => document.querySelector('.combo-list')?.remove());

  it('muestra todos los usuarios al hacer clic en el campo', async () => {
    const { fixture, input } = await setup();

    input.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Ana Torres', 'Luis Pérez', 'María Gómez']);
  });

  it('filtra al escribir, sin distinguir tildes y también por correo', async () => {
    const { type } = await setup();

    await type('perez');
    expect(labels()).toEqual(['Luis Pérez']);

    await type('maria@');
    expect(labels()).toEqual(['María Gómez']);
  });

  it('selecciona con Enter y actualiza el formulario', async () => {
    const { fixture, input, type } = await setup();
    await type('gom');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe(3);
    expect(input.value).toBe('María Gómez');
    expect(document.querySelector('.combo-list')).toBeNull();
  });

  it('al salir sin elegir, restaura la opción seleccionada', async () => {
    const { fixture, input, type } = await setup();
    fixture.componentInstance.control.setValue(1);
    await fixture.whenStable();
    expect(input.value).toBe('Ana Torres');

    await type('xyz');
    input.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();

    expect(input.value).toBe('Ana Torres');
    expect(fixture.componentInstance.control.value).toBe(1);
  });

  it('borrar el texto deja el valor vacío', async () => {
    const { fixture, type } = await setup();
    fixture.componentInstance.control.setValue(2);
    await fixture.whenStable();

    await type('');

    expect(fixture.componentInstance.control.value).toBeNull();
  });

  describe('con allowCustom (se puede escribir un valor nuevo)', () => {
    @Component({
      imports: [ComboboxComponent, ReactiveFormsModule],
      template: `<app-combobox
        inputId="genre"
        [formControl]="control"
        [options]="options"
        [allowCustom]="true"
        [maxlength]="20"
        newOptionLabel="Añadir género"
      />`,
    })
    class GenreHost {
      readonly control = new FormControl<string>('', { nonNullable: true });
      readonly options: ComboboxOption<string>[] = [
        { value: 'Novela', label: 'Novela' },
        { value: 'Novela negra', label: 'Novela negra' },
        { value: 'Terror', label: 'Terror' },
      ];
    }

    async function setupGenre() {
      const fixture = TestBed.createComponent(GenreHost);
      await fixture.whenStable();
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#genre')!;
      const type = async (text: string) => {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        await fixture.whenStable();
      };
      const blur = async () => {
        input.dispatchEvent(new FocusEvent('blur'));
        await fixture.whenStable();
      };
      return { fixture, input, type, blur };
    }

    it('al hacer clic muestra todas las sugerencias, sin fila «Añadir»', async () => {
      const { fixture, input } = await setupGenre();
      input.dispatchEvent(new Event('click'));
      await fixture.whenStable();

      expect(labels()).toEqual(['Novela', 'Novela negra', 'Terror']);
    });

    it('ofrece añadir lo escrito cuando no está en la lista y lo usa como valor', async () => {
      const { fixture, input, type } = await setupGenre();
      await type('Realismo sucio');

      expect(labels()).toEqual(['Añadir género «Realismo sucio»']);
      expect(fixture.componentInstance.control.value).toBe('Realismo sucio'); // ya es el valor
      expect(input.getAttribute('maxlength')).toBe('20');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      await fixture.whenStable();
      expect(fixture.componentInstance.control.value).toBe('Realismo sucio');
      expect(input.value).toBe('Realismo sucio');
    });

    it('no ofrece añadir si lo escrito coincide con una opción (sin distinguir tildes ni mayúsculas)', async () => {
      const { type } = await setupGenre();
      await type('novela');
      expect(labels()).toEqual(['Novela', 'Novela negra']); // sin «Añadir»

      await type('novela hist');
      expect(labels()).toEqual(['Añadir género «novela hist»']);
    });

    it('Enter elige la primera sugerencia; la fila «Añadir» queda al final', async () => {
      const { fixture, input, type } = await setupGenre();
      await type('nov');
      expect(labels()).toEqual(['Novela', 'Novela negra', 'Añadir género «nov»']);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      await fixture.whenStable();
      expect(fixture.componentInstance.control.value).toBe('Novela');
    });

    it('al salir, el texto escrito queda como valor y respeta la grafía de la opción existente', async () => {
      const { fixture, input, type, blur } = await setupGenre();
      await type('Poesía épica');
      await blur();
      expect(fixture.componentInstance.control.value).toBe('Poesía épica');
      expect(input.value).toBe('Poesía épica');

      await type('terror');
      await blur();
      expect(fixture.componentInstance.control.value).toBe('Terror'); // grafía de la lista
      expect(input.value).toBe('Terror');
    });

    it('elegir con el ratón una sugerencia no deja el texto parcial como valor', async () => {
      const { fixture, input, type } = await setupGenre();
      await type('ter');
      (document.querySelector('.combo-option') as HTMLElement).click();
      await fixture.whenStable();

      expect(fixture.componentInstance.control.value).toBe('Terror');
      expect(input.value).toBe('Terror');
    });

    it('borrar el texto deja el valor vacío (cadena vacía, no null)', async () => {
      const { fixture, type } = await setupGenre();
      fixture.componentInstance.control.setValue('Terror');
      await fixture.whenStable();

      await type('');
      expect(fixture.componentInstance.control.value).toBe('');
    });

    it('muestra un valor que no está en la lista (p. ej. al editar un libro)', async () => {
      const { fixture, input } = await setupGenre();
      fixture.componentInstance.control.setValue('Cyberpunk');
      await fixture.whenStable();

      expect(input.value).toBe('Cyberpunk');
    });
  });

});
