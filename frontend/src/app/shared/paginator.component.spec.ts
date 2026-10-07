import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

@Component({
  imports: [PaginatorComponent],
  template: `
    <app-paginator
      [page]="page()"
      [size]="10"
      [totalElements]="total()"
      [totalPages]="pages()"
      (pageChange)="page.set($event)"
      (sizeChange)="newSize.set($event)"
    />
  `,
})
class HostComponent {
  readonly page = signal(0);
  readonly total = signal(57);
  readonly pages = signal(6);
  readonly newSize = signal<number | null>(null);
}

describe('PaginatorComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const pageLabels = () =>
      Array.from(el.querySelectorAll('.pages li')).map((li) => li.textContent?.trim());
    return { fixture, el, pageLabels };
  }

  it('resume el rango mostrado', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('.summary')?.textContent).toContain('1–10');
    fixture.componentInstance.page.set(5);
    await fixture.whenStable();
    expect(el.querySelector('.summary')?.textContent).toContain('51–57');
    expect(el.querySelector('.summary')?.textContent).toContain('57');
  });

  it('muestra primera, última y vecinas, con "…" en los saltos', async () => {
    const { fixture, pageLabels } = await setup();
    fixture.componentInstance.pages.set(20);
    fixture.componentInstance.total.set(200);
    fixture.componentInstance.page.set(9);
    await fixture.whenStable();
    expect(pageLabels()).toEqual(['1', '…', '8', '9', '10', '11', '12', '…', '20']);
  });

  it('marca la página actual y navega con anterior / siguiente', async () => {
    const { fixture, el } = await setup();
    const prev = el.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!;
    const next = el.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!;
    expect(prev.disabled).toBe(true);

    next.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(1);
    expect(el.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
  });

  it('emite el nuevo tamaño de página', async () => {
    const { fixture, el } = await setup();
    const select = el.querySelector('select')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.newSize()).toBe(50);
  });
});
