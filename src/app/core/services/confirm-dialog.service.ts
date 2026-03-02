import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

export interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private result$ = new Subject<boolean>();
  private _state$ = new BehaviorSubject<ConfirmState | null>(null);
  readonly state$ = this._state$.asObservable();

  confirm(options: ConfirmOptions): Observable<boolean> {
    this._state$.next({ ...options, open: true });
    return this.result$.pipe(take(1));
  }

  resolve(value: boolean): void {
    this._state$.next(null);
    this.result$.next(value);
  }
}
