import { Injectable, signal } from '@angular/core';

export type NoticeKind = 'ok' | 'error' | 'info' | 'warn';

export interface Notice {
  kind: 'ok' | 'error' | 'info' | 'warn';
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

  info(text: string): void {
    this.show({ kind: 'info', text });
  }

  warn(text: string): void {
    this.show({ kind: 'warn', text });
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.notice.set(null);
  }

  private show(notice: Notice): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.notice.set({ kind: notice.kind, text: notice.text });
    this.timer = setTimeout(() => {
      this.notice.set(null);
      this.timer = undefined;
    }, 5000);
  }
}
