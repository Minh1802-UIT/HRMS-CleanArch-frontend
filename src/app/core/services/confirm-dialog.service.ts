import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { signal } from '@angular/core';
import { take } from 'rxjs/operators';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
  confirmClass?: string;
}

export interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private result$ = new Subject<boolean>();
  private _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();

  confirm(options: ConfirmOptions): Observable<boolean> {
    this._state.set({ ...options, open: true });
    return this.result$.pipe(take(1));
  }

  resolve(value: boolean): void {
    this._state.set(null);
    this.result$.next(value);
  }
}
