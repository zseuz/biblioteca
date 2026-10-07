import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="skeleton-placeholder"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius()"
    ></div>
  `,
  styles: `
    :host {
      display: block;
      line-height: 1;
    }

    .skeleton-placeholder {
      display: inline-block;
      width: 100%;
      height: 1rem;
      background: linear-gradient(
        90deg,
        var(--surface-subtle) 25%,
        var(--hover) 37%,
        var(--surface-subtle) 63%
      );
      background-size: 400% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
      border-radius: var(--radius-sm);
    }

    @keyframes skeleton-shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly radius = input<string>('var(--radius-sm)');
}
