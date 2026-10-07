import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Stats } from '../core/models';
import { BarListChartComponent } from '../shared/charts/bar-list-chart.component';
import { ChartTableComponent } from '../shared/charts/chart-table.component';
import { ChartDatum, ChartUnit } from '../shared/charts/chart.models';
import { ColumnChartComponent } from '../shared/charts/column-chart.component';
import {
  StackedBarChartComponent,
  StackedSegment,
} from '../shared/charts/stacked-bar-chart.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { IconComponent } from '../shared/icon.component';
import { SkeletonComponent } from '../shared/skeleton.component';

/** Identificadores de las tarjetas que pueden alternar entre gráfica y tabla. */
type ChartId = 'months' | 'status' | 'books' | 'genres' | 'members';

const LOANS: ChartUnit = { one: 'préstamo', many: 'préstamos' };

/** "2026-10" -> Date del día 1 de ese mes (hora local, sin desfases de zona horaria). */
function monthDate(isoMonth: string): Date {
  const [year, month] = isoMonth.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

const shortMonth = new Intl.DateTimeFormat('es', { month: 'short' });
const longMonth = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

/** Mayúscula solo en la primera letra ("octubre de 2026" -> "Octubre de 2026"). */
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

@Component({
  selector: 'app-stats-page',
  imports: [
    NgTemplateOutlet,
    IconComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ColumnChartComponent,
    BarListChartComponent,
    StackedBarChartComponent,
    ChartTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Encabezado de página -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Panel de Estadísticas</h1>
        <p class="page-desc">
          Métricas clave sobre demanda de títulos, categorías más leídas y circulación
          bibliotecaria.
        </p>
      </div>
      <button type="button" class="btn btn-secondary" (click)="load()" [disabled]="loading()">
        <app-icon name="refresh" [size]="16" [class.spinning]="loading()" />
        Actualizar datos
      </button>
    </div>

    @if (loading() && !stats()) {
      <!-- Solo la primera carga muestra esqueletos; al actualizar se conserva el panel. -->
      <div class="kpi-grid">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="card"><app-skeleton height="4.5rem" /></div>
        }
      </div>
      <div class="charts-row">
        <div class="card"><app-skeleton height="16rem" /></div>
        <div class="card"><app-skeleton height="16rem" /></div>
      </div>
    } @else if (stats(); as s) {
      <div class="dashboard" [class.refreshing]="loading()" [attr.aria-busy]="loading()">
        @if (s.totalBooks === 0 && s.totalMembers === 0 && s.activeLoans + s.overdueLoans + s.returnedLoans === 0) {
          <p class="no-data-banner" role="status">
            <app-icon name="info" [size]="16" />
            Aún no hay datos registrados. Agrega libros y usuarios y registra préstamos para ver las estadísticas.
          </p>
        }
        <!-- Tarjetas KPI principales -->
        <div class="kpi-grid">
          <div class="kpi-card card">
            <div class="kpi-icon-wrap primary"><app-icon name="book" [size]="24" /></div>
            <div class="kpi-data">
              <span class="kpi-val">{{ s.totalBooks }}</span>
              <span class="kpi-label">Títulos en catálogo</span>
            </div>
          </div>

          <div class="kpi-card card">
            <div class="kpi-icon-wrap info"><app-icon name="users" [size]="24" /></div>
            <div class="kpi-data">
              <span class="kpi-val">{{ s.totalMembers }}</span>
              <span class="kpi-label">Usuarios registrados</span>
            </div>
          </div>

          <div class="kpi-card card">
            <div class="kpi-icon-wrap success"><app-icon name="loans" [size]="24" /></div>
            <div class="kpi-data">
              <span class="kpi-val">{{ s.activeLoans }}</span>
              <span class="kpi-label">Préstamos activos</span>
            </div>
          </div>

          <div class="kpi-card card" [class.kpi-alert]="s.overdueLoans > 0">
            <div class="kpi-icon-wrap danger"><app-icon name="alert" [size]="24" /></div>
            <div class="kpi-data">
              <span class="kpi-val" [class.danger-text]="s.overdueLoans > 0">{{ s.overdueLoans }}</span>
              <span class="kpi-label">Préstamos vencidos</span>
            </div>
            @if (s.overdueLoans > 0) {
              <span class="badge bad alert-badge">Requiere atención</span>
            }
          </div>
        </div>

        <!-- Fila 1: tendencia + estado -->
        <div class="charts-row">
          <section class="card panel" aria-labelledby="c-months">
            <ng-container
              *ngTemplateOutlet="header; context: { id: 'months', icon: 'chart', title: 'Préstamos por mes', sub: 'Últimos 6 meses' }"
            />
            @if (monthsTotal(s) === 0) {
              <app-empty-state icon="chart" title="Sin préstamos recientes" message="No hay préstamos registrados en los últimos 6 meses." />
            } @else if (isTable('months')) {
              <app-chart-table
                [data]="s.loansByMonth"
                caption="Préstamos iniciados por mes"
                labelHeader="Mes"
                valueHeader="Préstamos"
                [formatLabel]="formatMonthLong"
              />
            } @else {
              <app-column-chart
                [data]="s.loansByMonth"
                [unit]="loansUnit"
                [tickLabel]="formatMonthShort"
                [fullLabel]="formatMonthLong"
                [ariaLabel]="monthsSummary()"
              />
            }
          </section>

          <section class="card panel" aria-labelledby="c-status">
            <ng-container
              *ngTemplateOutlet="header; context: { id: 'status', icon: 'loans', title: 'Estado de los préstamos', sub: 'Histórico' }"
            />
            @if (s.activeLoans + s.overdueLoans + s.returnedLoans === 0) {
              <app-empty-state icon="loans" title="Sin préstamos" message="Aún no se ha registrado ningún préstamo." />
            } @else if (isTable('status')) {
              <app-chart-table
                [data]="statusTable()"
                caption="Préstamos por estado"
                labelHeader="Estado"
                valueHeader="Préstamos"
                [showShare]="true"
              />
            } @else {
              <app-stacked-bar-chart
                [segments]="statusSegments()"
                totalLabel="préstamos registrados"
                ariaLabel="Distribución de préstamos por estado"
              />
            }
          </section>
        </div>

        <!-- Fila 2: rankings -->
        <div class="panels-grid">
          <section class="card panel" aria-labelledby="c-books">
            <ng-container
              *ngTemplateOutlet="header; context: { id: 'books', icon: 'book-open', title: 'Libros más prestados', sub: 'Top 5' }"
            />
            @if (s.topBooks.length === 0) {
              <app-empty-state icon="book" title="Sin registros" message="Aún no hay préstamos para construir el ranking." />
            } @else if (isTable('books')) {
              <app-chart-table [data]="s.topBooks" caption="Libros más prestados" labelHeader="Libro" valueHeader="Préstamos" />
            } @else {
              <app-bar-list-chart [data]="s.topBooks" [unit]="loansUnit" [ranked]="true" ariaLabel="Libros más prestados" />
            }
          </section>

          <section class="card panel" aria-labelledby="c-genres">
            <ng-container
              *ngTemplateOutlet="header; context: { id: 'genres', icon: 'filter', title: 'Préstamos por género', sub: 'Distribución' }"
            />
            @if (s.loansByGenre.length === 0) {
              <app-empty-state icon="chart" title="Sin géneros" message="No hay préstamos para clasificar por género." />
            } @else if (isTable('genres')) {
              <app-chart-table
                [data]="s.loansByGenre"
                caption="Préstamos por género"
                labelHeader="Género"
                valueHeader="Préstamos"
                [showShare]="true"
              />
            } @else {
              <app-bar-list-chart [data]="s.loansByGenre" [unit]="loansUnit" [showShare]="true" ariaLabel="Préstamos por género" />
            }
          </section>

          <section class="card panel" aria-labelledby="c-members">
            <ng-container
              *ngTemplateOutlet="header; context: { id: 'members', icon: 'users', title: 'Usuarios más activos', sub: 'Top 5' }"
            />
            @if (s.topMembers.length === 0) {
              <app-empty-state icon="users" title="Sin lectores activos" message="Aún no hay actividad de lectura registrada." />
            } @else if (isTable('members')) {
              <app-chart-table [data]="s.topMembers" caption="Usuarios más activos" labelHeader="Usuario" valueHeader="Préstamos" />
            } @else {
              <app-bar-list-chart [data]="s.topMembers" [unit]="loansUnit" [ranked]="true" ariaLabel="Usuarios más activos" />
            }
          </section>
        </div>
      </div>
    } @else {
      <app-empty-state
        icon="chart"
        title="No se pudieron cargar las estadísticas"
        message="Ocurrió un inconveniente al consultar las métricas con el servidor."
        actionLabel="Reintentar"
        (action)="load()"
      />
    }

    <!-- Cabecera común de las tarjetas: título + selector Gráfica/Tabla -->
    <ng-template #header let-id="id" let-icon="icon" let-title="title" let-sub="sub">
      <div class="panel-header">
        <div class="panel-icon-title">
          <div class="panel-badge-icon"><app-icon [name]="icon" [size]="18" /></div>
          <div>
            <h2 [id]="'c-' + id" class="panel-title">{{ title }}</h2>
            <span class="panel-sub">{{ sub }}</span>
          </div>
        </div>
        <div class="view-switch" role="group" [attr.aria-label]="'Vista de ' + title">
          <button type="button" [attr.aria-pressed]="!isTable(id)" (click)="setView(id, false)" title="Ver gráfica">
            <app-icon name="chart" [size]="14" /><span class="sr-only">Gráfica</span>
          </button>
          <button type="button" [attr.aria-pressed]="isTable(id)" (click)="setView(id, true)" title="Ver tabla">
            <app-icon name="table" [size]="14" /><span class="sr-only">Tabla</span>
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    .no-data-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0 0 1rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-subtle);
      color: var(--text);
      font-size: 0.9rem;
    }
    .no-data-banner app-icon {
      flex-shrink: 0;
      color: var(--primary);
    }
    .spinning {
      animation: spin 0.8s linear infinite;
    }

    /* Al actualizar se mantiene el panel anterior atenuado: sin saltos ni parpadeos. */
    .dashboard {
      transition: opacity 0.2s ease;
    }
    .dashboard.refreshing {
      opacity: 0.55;
      pointer-events: none;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .kpi-card {
      margin-bottom: 0;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      position: relative;
      overflow: hidden;
    }
    .kpi-card.kpi-alert {
      border-color: var(--danger-border);
      background: linear-gradient(180deg, var(--surface) 0%, var(--danger-light) 100%);
    }
    .kpi-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-icon-wrap.primary {
      background: var(--primary-light);
      color: var(--primary);
    }
    .kpi-icon-wrap.info {
      background: var(--info-light);
      color: var(--info);
    }
    .kpi-icon-wrap.success {
      background: var(--success-light);
      color: var(--ok);
    }
    .kpi-icon-wrap.danger {
      background: var(--danger-light);
      color: var(--danger);
    }
    .kpi-data {
      display: flex;
      flex-direction: column;
    }
    .kpi-val {
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .danger-text {
      color: var(--danger);
    }
    .kpi-label {
      font-size: 0.825rem;
      color: var(--muted);
      font-weight: 600;
      margin-top: 0.2rem;
    }
    .alert-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      font-size: 0.7rem;
    }

    /* Tendencia (ancha) + estado (estrecha); en pantallas medianas se apilan. */
    .charts-row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 1.25rem;
      margin-bottom: 1.25rem;
    }
    @media (max-width: 960px) {
      .charts-row {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    .panels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
    }
    .panel {
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
      margin-bottom: 1.1rem;
    }
    .panel-icon-title {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }
    .panel-badge-icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: var(--radius-md);
      background: var(--surface-subtle);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
    }
    .panel-sub {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Selector Gráfica / Tabla */
    .view-switch {
      display: flex;
      flex-shrink: 0;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
    }
    .view-switch button {
      width: 28px;
      height: 26px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
    }
    .view-switch button[aria-pressed='true'] {
      background: var(--surface);
      color: var(--primary);
      box-shadow: var(--shadow-xs);
    }
  `,
})
export class StatsPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);
  readonly loading = signal(true);
  /** Tarjetas que el usuario cambió a vista de tabla. */
  private readonly tableViews = signal<ReadonlySet<ChartId>>(new Set());

  protected readonly loansUnit = LOANS;

  // Formateadores como propiedades (referencias estables para los inputs OnPush).
  protected readonly formatMonthShort = (iso: string): string =>
    capitalize(shortMonth.format(monthDate(iso)).replace('.', ''));
  protected readonly formatMonthLong = (iso: string): string =>
    capitalize(longMonth.format(monthDate(iso)));

  /**
   * Estado de los préstamos como partes de un todo. "Activos" del API incluye los vencidos,
   * así que aquí se separan para que los segmentos no se solapen.
   * Colores: estado fijo (verde/rojo) acompañado siempre de icono y texto en la leyenda.
   */
  protected readonly statusSegments = computed<StackedSegment[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { key: 'returned', label: 'Devueltos', count: s.returnedLoans, color: 'var(--chart-good)', icon: 'check' },
      { key: 'onTime', label: 'Activos al día', count: s.activeLoans, color: 'var(--chart-series)', icon: 'loans' },
      { key: 'overdue', label: 'Vencidos', count: s.overdueLoans, color: 'var(--chart-critical)', icon: 'alert' },
    ];
  });

  protected readonly statusTable = computed<ChartDatum[]>(() =>
    this.statusSegments().map((seg) => ({ label: seg.label, count: seg.count })),
  );

  /** Resumen textual de la tendencia para lectores de pantalla. */
  /** Préstamos de los últimos meses en total (0 = no hay actividad que dibujar). */
  protected monthsTotal(s: Stats): number {
    return s.loansByMonth.reduce((sum, m) => sum + m.count, 0);
  }

  protected readonly monthsSummary = computed(() => {
    const months = this.stats()?.loansByMonth ?? [];
    if (!months.length) return 'Sin datos';
    const total = months.reduce((sum, m) => sum + m.count, 0);
    const last = months[months.length - 1];
    return `Préstamos por mes en los últimos ${months.length} meses: ${total} en total; ` +
      `${this.formatMonthLong(last.label)}: ${last.count}.`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.stats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected isTable(id: ChartId): boolean {
    return this.tableViews().has(id);
  }

  protected setView(id: ChartId, table: boolean): void {
    this.tableViews.update((views) => {
      const next = new Set(views);
      if (table) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
