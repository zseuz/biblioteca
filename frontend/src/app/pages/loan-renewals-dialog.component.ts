import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Loan, LoanRenewalHistory } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';

/** "2026-10-07" → "07/10/2026". */
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Historial de renovaciones de un préstamo: arriba los datos del préstamo inicial (cuándo se
 * prestó y su vencimiento original) y debajo cada renovación con su fecha y hora y cómo cambió
 * la fecha límite.
 */
@Component({
  selector: 'app-loan-renewals-dialog',
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loan(); as l) {
      <app-modal
        [open]="true"
        title="Historial de renovaciones"
        [subtitle]="l.bookTitle + ' · ' + l.memberName"
        size="md"
        (close)="close.emit()"
      >
        @if (history(); as h) {
          <section class="initial" aria-labelledby="initial-title">
            <h3 id="initial-title" class="section-title">
              <app-icon name="calendar" [size]="15" />
              Préstamo inicial
            </h3>
            <dl class="facts">
              <div>
                <dt>Prestado el</dt>
                <dd>{{ date(h.loan.loanDate) }}</dd>
              </div>
              <div>
                <dt>Vencimiento original</dt>
                <dd>{{ date(h.originalDueDate) }}</dd>
              </div>
              <div>
                <dt>Vencimiento actual</dt>
                <dd class="current">{{ date(h.loan.dueDate) }}</dd>
              </div>
            </dl>
          </section>

          <h3 class="section-title">
            <app-icon name="history" [size]="15" />
            Renovaciones ({{ h.loan.renewals ?? h.renewals.length }})
          </h3>

          @if (h.unrecordedRenewals > 0) {
            <p class="note">
              <app-icon name="info" [size]="15" />
              {{
                h.unrecordedRenewals === 1
                  ? '1 renovación se hizo antes de que se guardara el historial y no tiene detalle.'
                  : h.unrecordedRenewals + ' renovaciones se hicieron antes de que se guardara el historial y no tienen detalle.'
              }}
              @if (h.loan.lastRenewedOn && h.renewals.length === 0) {
                Última renovación: {{ date(h.loan.lastRenewedOn) }}.
              }
            </p>
          }

          @if (h.renewals.length > 0) {
            <ol class="timeline">
              @for (r of h.renewals; track r.number) {
                <li>
                  <span class="dot" aria-hidden="true"></span>
                  <div class="entry">
                    <div class="entry-head">
                      <strong>Renovación {{ r.number }}</strong>
                      <span class="when">{{ date(r.renewedAt) }} a las {{ time(r.renewedAt) }}</span>
                    </div>
                    <div class="entry-body">
                      Vencimiento: {{ date(r.previousDueDate) }}
                      <span class="arrow" aria-label="pasó a">→</span>
                      <strong>{{ date(r.newDueDate) }}</strong>
                      <span class="chip">+{{ r.daysAdded }} {{ r.daysAdded === 1 ? 'día' : 'días' }}</span>
                    </div>
                  </div>
                </li>
              }
            </ol>
          } @else if (h.unrecordedRenewals === 0) {
            <p class="empty">Este préstamo no se ha renovado.</p>
          }
        } @else {
          <div class="loading" role="status">
            <span class="spinner-sm" aria-hidden="true"></span>
            Cargando historial…
          </div>
        }

        <div modal-actions class="actions">
          <button type="button" class="btn btn-secondary" (click)="close.emit()">Cerrar</button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0 0 0.6rem;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .initial {
      margin-bottom: 1.25rem;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      margin: 0;
    }
    .facts > div {
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
    }
    .facts dt {
      font-size: 0.75rem;
      color: var(--muted);
    }
    .facts dd {
      margin: 0.15rem 0 0;
      font-weight: 600;
      color: var(--text);
    }
    .facts dd.current {
      color: var(--primary);
    }
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0 0 0 0.35rem;
    }
    .timeline li {
      position: relative;
      display: flex;
      gap: 0.85rem;
      padding-bottom: 0.9rem;
    }
    /* Línea vertical que une los puntos */
    .timeline li:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 14px;
      bottom: -2px;
      width: 2px;
      background: var(--border);
    }
    .dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      margin-top: 5px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 0 3px var(--surface);
    }
    .entry {
      flex: 1;
      min-width: 0;
    }
    .entry-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.25rem 0.75rem;
      font-size: 0.875rem;
      color: var(--text);
    }
    .when {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .entry-body {
      margin-top: 0.2rem;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .entry-body strong {
      color: var(--text);
    }
    .arrow {
      margin: 0 0.2rem;
    }
    .chip {
      display: inline-block;
      margin-left: 0.4rem;
      padding: 0.05rem 0.45rem;
      border-radius: 999px;
      background: var(--success-light);
      color: var(--success);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .note {
      display: flex;
      gap: 0.5rem;
      margin: 0 0 0.75rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
      font-size: 0.85rem;
      color: var(--text);
    }
    .note app-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      color: var(--primary);
    }
    .empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--muted);
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 2rem 0;
      color: var(--muted);
      font-size: 0.875rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    @media (max-width: 520px) {
      .facts {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LoanRenewalsDialogComponent {
  /** Préstamo cuyo historial se muestra; {@code null} cierra la ventana. */
  readonly loan = input<Loan | null>(null);
  /** Historial cargado; mientras sea {@code null} se muestra "Cargando". */
  readonly history = input<LoanRenewalHistory | null>(null);
  /** Cerrar la ventana. */
  readonly close = output<void>();

  /** Fecha en formato 07/10/2026 (acepta también fecha y hora). */
  protected date(iso: string): string {
    return formatDate(iso);
  }

  /** "2026-10-07T10:42:05" → "10:42". */
  protected time(iso: string): string {
    return iso.slice(11, 16);
  }
}
