import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warn';
  title: string;
  detail: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private add(type: Toast['type'], summary: string, detail: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this._toasts.update(toasts => [...toasts, { id, type, title: summary, detail }]);
    setTimeout(() => this.remove(id), 4500);
  }

  remove(id: number) {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  showSuccess(summary: string, detail: string) { this.add('success', summary, detail); }
  showError(summary: string, detail: string)   { this.add('error',   summary, detail); }
  showInfo(summary: string, detail: string)    { this.add('info',    summary, detail); }
  showWarn(summary: string, detail: string)    { this.add('warn',    summary, detail); }
}
