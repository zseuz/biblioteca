import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { StatEntry, Stats } from '../core/models';

@Component({
  selector: 'app-stats-page',
  template: `
    <h1>Estadísticas</h1>

    @if (loading()) {
      <p class="empty">Cargando…</p>
    } @else if (stats(); as s) {
      <div class="grid kpis">
        <div class="card kpi"><strong>{{ s.totalBooks }}</strong><span>Libros</span></div>
        <div class="card kpi"><strong>{{ s.totalMembers }}</strong><span>Usuarios</span></div>
        <div class="card kpi"><strong>{{ s.activeLoans }}</strong><span>Préstamos activos</span></div>
        <div class="card kpi" [class.alert]="s.overdueLoans > 0"><strong>{{ s.overdueLoans }}</strong><span>Vencidos</span></div>
      </div>

      <div class="grid panels">
        <section class="card" aria-labelledby="t1">
          <h2 id="t1">Libros más prestados</h2>
          <ng-container *ngTemplateOutlet="bars; context: { $implicit: s.topBooks }" />
        </section>
        <section class="card" aria-labelledby="t2">
          <h2 id="t2">Préstamos por género</h2>
          <ng-container *ngTemplateOutlet="bars; context: { $implicit: s.loansByGenre }" />
        </section>
        <section class="card" aria-labelledby="t3">
          <h2 id="t3">Usuarios más activos</h2>
          <ng-container *ngTemplateOutlet="bars; context: { $implicit: s.topMembers }" />
        </section>
      </div>
    }

    <ng-template #bars let-entries>
      @if (entries.length === 0) {
        <p class="empty">Sin datos todavía.</p>
      } @else {
        <ul class="bars">
          @for (e of entries; track e.label) {
            <li>
              <span class="label">{{ e.label }}</span>
              <span class="bar" [style.width.%]="percent(e, entries)" aria-hidden="true"></span>
              <span class="value">{{ e.count }}</span>
            </li>
          }
        </ul>
      }
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  styles: `
    .kpis { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .kpi { margin: 0; display: flex; flex-direction: column; }
    .kpi strong { font-size: 2rem; line-height: 1.1; }
    .kpi span { color: var(--muted); }
    .kpi.alert strong { color: var(--danger); }
    .panels { margin-top: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .bars { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .bars li { display: grid; grid-template-columns: 1fr auto; gap: .15rem .5rem; align-items: center; }
    .label { grid-column: 1 / -1; font-size: .9rem; }
    .bar { height: 10px; background: var(--primary); border-radius: 5px; min-width: 4px; }
    .value { font-weight: 600; justify-self: end; }
  `,
})
export class StatsPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.stats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  percent(entry: StatEntry, all: StatEntry[]): number {
    const max = Math.max(...all.map(e => e.count), 1);
    return (entry.count / max) * 100;
  }
}
