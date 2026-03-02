import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts = this._toasts$.asObservable();

  private add(type: Toast['type'], summary: string, detail: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this._toasts$.next([...this._toasts$.value, { id, type, title: summary, detail }]);
    setTimeout(() => this.remove(id), 4500);
  }

  remove(id: number) {
    this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
  }

  showSuccess(summary: string, detail: string) { this.add('success', summary, detail); }
  showError(summary: string, detail: string)   { this.add('error',   summary, detail); }
  showInfo(summary: string, detail: string)    { this.add('info',    summary, detail); }
  showWarn(summary: string, detail: string)    { this.add('warn',    summary, detail); }
}
