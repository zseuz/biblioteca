import { Injectable, signal } from '@angular/core';

export interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class NotifyService {
  readonly notice = signal<Notice | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  ok(text: string): void {
    this.show({ kind: 'ok', text });
  }

  error(text: string): void {
    this.show({ kind: 'error', text });
  }

  clear(): void {
    clearTimeout(this.timer);
    this.notice.set(null);
  }

  private show(notice: Notice): void {
    clearTimeout(this.timer);
    this.notice.set(notice);
    this.timer = setTimeout(() => this.notice.set(null), 6000);
  }
}
