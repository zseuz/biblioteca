import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Book, BookInput } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';

/** Libro ya registrado detectado al intentar crear uno nuevo. */
export type BookDuplicate =
  /** Mismo título, autor y género: se ofrece sumar los ejemplares al existente. */
  | { kind: 'same'; existing: Book; draft: BookInput }
  /** Mismo título y autor, otro género: se muestra la diferencia para confirmar. */
  | { kind: 'genre'; existing: Book[]; draft: BookInput };

/**
 * Aviso que aparece antes de crear un libro que ya existe.
 *
 * <ul>
 *   <li><b>Mismo libro:</b> muestra el registrado y ofrece añadir los ejemplares que se iban a
 *       ingresar, con el total resultante, en lugar de duplicar el registro.</li>
 *   <li><b>Otro género:</b> compara lado a lado lo registrado y lo nuevo, resaltando el género,
 *       para que el usuario confirme si es correcto o vuelva a corregirlo.</li>
 * </ul>
 */
@Component({
  selector: 'app-book-duplicate-dialog',
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (duplicate(); as dup) {
      <app-modal
        [open]="true"
        [title]="dup.kind === 'same' ? 'Este libro ya está registrado' : 'Ya existe con otro género'"
        [subtitle]="
          dup.kind === 'same'
            ? 'Para no duplicar el registro, puedes sumar los ejemplares al libro existente'
            : 'Revisa la diferencia antes de crear un registro nuevo'
        "
        size="md"
        (close)="back.emit()"
      >
        @if (dup.kind === 'same') {
          <div class="dup-card">
            <div class="dup-card-icon"><app-icon name="book" [size]="20" /></div>
            <div>
              <strong>{{ dup.existing.title }}</strong>
              <span>{{ dup.existing.author }} · {{ dup.existing.genre }}</span>
              <span>
                {{ copies(dup.existing.totalCopies) }} ({{ available(dup.existing.availableCopies) }})
              </span>
            </div>
          </div>
          <p class="dup-text">
            ¿Quieres añadir los <strong>{{ copies(dup.draft.totalCopies) }}</strong> que ibas a
            ingresar? El libro quedará con
            <strong>{{ dup.existing.totalCopies + dup.draft.totalCopies }}</strong> en total y
            <strong>{{ available(dup.existing.availableCopies + dup.draft.totalCopies) }}</strong>.
          </p>
        } @else {
          <div class="table-wrap dup-compare">
            <table>
              <caption class="sr-only">Comparación entre el libro registrado y el nuevo</caption>
              <thead>
                <tr>
                  <th scope="col">Dato</th>
                  <th scope="col">{{ dup.existing.length === 1 ? 'Ya registrado' : 'Ya registrados' }}</th>
                  <th scope="col">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Título</th>
                  <td>{{ dup.existing[0].title }}</td>
                  <td>{{ dup.draft.title }}</td>
                </tr>
                <tr>
                  <th scope="row">Autor</th>
                  <td>{{ dup.existing[0].author }}</td>
                  <td>{{ dup.draft.author }}</td>
                </tr>
                <tr class="dup-diff">
                  <th scope="row">Género <span class="badge warn">Diferente</span></th>
                  <td>{{ existingGenres() }}</td>
                  <td><strong>{{ dup.draft.genre }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="dup-text">
            ¿El género <strong>«{{ dup.draft.genre }}»</strong> es correcto? Si lo es, se creará un
            registro nuevo; si no, vuelve al formulario para corregirlo.
          </p>
        }

        <div modal-actions>
          <button type="button" class="btn btn-secondary" (click)="back.emit()" [disabled]="busy()">
            {{ dup.kind === 'same' ? 'Volver al formulario' : 'Revisar' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="busy()"
            (click)="dup.kind === 'same' ? addCopies.emit() : createAnyway.emit()"
          >
            @if (busy()) {
              <span class="spinner-sm"></span>
            }
            {{ dup.kind === 'same' ? 'Añadir ' + copies(dup.draft.totalCopies) : 'Sí, es correcto: crear' }}
          </button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .dup-card {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-subtle);
    }
    .dup-card > div:last-child {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.88rem;
      color: var(--muted);
    }
    .dup-card strong {
      color: var(--text);
      font-size: 0.95rem;
    }
    .dup-card-icon {
      width: 38px;
      height: 44px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      background: var(--primary-light);
      color: var(--primary);
    }
    .dup-text {
      margin: 1rem 0 0;
      font-size: 0.9rem;
      line-height: 1.55;
      color: var(--text);
    }
    .dup-compare {
      box-shadow: none;
    }
    .dup-compare th,
    .dup-compare td {
      white-space: normal;
      text-transform: none;
      letter-spacing: normal;
    }
    .dup-compare tbody th {
      font-weight: 600;
      color: var(--muted);
      background: transparent;
    }
    .dup-compare .dup-diff td,
    .dup-compare .dup-diff th {
      background: var(--warning-light);
    }
    .dup-diff .badge {
      margin-left: 0.35rem;
      font-size: 0.7rem;
    }
  `,
})
export class BookDuplicateDialogComponent {
  /** Duplicado detectado; {@code null} oculta el aviso. */
  readonly duplicate = input<BookDuplicate | null>(null);
  /** Hay una operación en curso (deshabilita los botones). */
  readonly busy = input<boolean>(false);

  /** Sumar los ejemplares del formulario al libro existente. */
  readonly addCopies = output<void>();
  /** El género distinto es correcto: crear el libro nuevo. */
  readonly createAnyway = output<void>();
  /** Volver al formulario sin hacer nada. */
  readonly back = output<void>();

  protected readonly existingGenres = computed(() => {
    const dup = this.duplicate();
    return dup?.kind === 'genre' ? dup.existing.map((b) => b.genre).join(', ') : '';
  });

  protected available(n: number): string {
    return `${n} ${n === 1 ? 'disponible' : 'disponibles'}`;
  }

  protected copies(n: number): string {
    return `${n} ${n === 1 ? 'ejemplar' : 'ejemplares'}`;
  }
}
