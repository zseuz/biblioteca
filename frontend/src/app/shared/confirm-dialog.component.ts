import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="title()" [subtitle]="''" size="sm" (close)="cancel.emit()">
      <div class="confirm-content">
        <div class="confirm-icon-wrap" [class.danger]="variant() === 'danger'">
          <app-icon [name]="variant() === 'danger' ? 'alert' : 'info'" [size]="28" />
        </div>
        <p class="confirm-message">{{ message() }}</p>
      </div>

      <div modal-actions class="confirm-actions">
        <button
          type="button"
          class="btn btn-secondary"
          [disabled]="loading()"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn"
          [class.btn-danger]="variant() === 'danger'"
          [class.btn-primary]="variant() !== 'danger'"
          [disabled]="loading()"
          (click)="confirm.emit()"
        >
          @if (loading()) {
            <span class="spinner-sm"></span>
          }
          {{ confirmText() }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .confirm-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0.5rem 0 1rem;
      gap: 1rem;
    }

    .confirm-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-icon-wrap.danger {
      background: var(--danger-light);
      color: var(--danger);
    }

    .confirm-message {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      width: 100%;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmText = input<string>('Confirmar');
  readonly variant = input<'danger' | 'primary'>('danger');
  readonly loading = input<boolean>(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
