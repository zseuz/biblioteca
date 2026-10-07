import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComboboxComponent, ComboboxOption } from './combobox.component';

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

describe('ComboboxComponent', () => {
  const labels = () =>
    Array.from(document.querySelectorAll('.combo-list .combo-label')).map((e) => e.textContent?.trim());

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
});
