import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActionMenuComponent, ActionMenuItem } from './action-menu.component';

/** Componente «anfitrión» de prueba: usa el menú igual que una pantalla real. */
@Component({
  imports: [ActionMenuComponent],
  template: `
    <p class="outside">fuera</p>
    <app-action-menu [items]="items" label="Acciones para Dune" (selected)="chosen.set($event)" />
  `,
})
class HostComponent {
  readonly items: ActionMenuItem[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', danger: true },
  ];
  readonly chosen = signal<string | null>(null);
}

/** Menú ⋮: abrir, elegir una opción, cerrar con Escape (devolviendo el foco) y al hacer clic fuera. */
describe('ActionMenuComponent', () => {
  const panel = () => document.querySelector<HTMLElement>('.menu-panel');

  /** Monta el anfitrión y devuelve lo necesario para interactuar con el menú. */
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"]',
    )!;
    return { fixture, trigger };
  }

  afterEach(() => panel()?.remove());

  it('abre el menú con sus opciones al pulsar los tres puntos', async () => {
    const { fixture, trigger } = await setup();
    expect(trigger.getAttribute('aria-label')).toBe('Acciones para Dune');

    trigger.click();
    await fixture.whenStable();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const labels = Array.from(panel()!.querySelectorAll('[role="menuitem"]')).map((i) =>
      i.textContent?.trim(),
    );
    expect(labels).toEqual(['Editar', 'Eliminar']);
    // El panel se monta en <body> para que no lo recorten contenedores con overflow.
    expect(panel()!.parentElement).toBe(document.body);
  });

  it('emite la opción elegida y se cierra', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    panel()!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.chosen()).toBe('delete');
    expect(panel()).toBeNull();
  });

  it('se cierra con Escape y devuelve el foco al botón', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('se cierra al hacer clic fuera', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    const outside = (fixture.nativeElement as HTMLElement).querySelector('.outside')!;
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });
});
