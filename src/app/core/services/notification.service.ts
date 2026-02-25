import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { NotificationItem } from '@core/models/notification.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  private _unreadCount = new BehaviorSubject<number>(0);
  /** Observable of unread notification count — subscribe in navbar. */
  unreadCount$ = this._unreadCount.asObservable();

  constructor(private http: HttpClient, private logger: LoggerService) {}

  /** Load notifications and refresh unread count badge. */
  getMyNotifications(unreadOnly = false): Observable<NotificationItem[]> {
    const url = unreadOnly ? `${this.apiUrl}?unreadOnly=true` : this.apiUrl;
    return this.http.get<ApiResponse<NotificationItem[]>>(url).pipe(
      map(res => res.data ?? []),
      catchError(err => {
        this.logger.error('NotificationService: getMyNotifications failed', err);
        return of([]);
      })
    );
  }

  /** Fetch and push unread count into the BehaviorSubject. */
  refreshUnreadCount(): void {
    this.http.get<ApiResponse<number>>(`${this.apiUrl}/unread-count`).pipe(
      map(res => res.data ?? 0),
      catchError(() => of(0))
    ).subscribe(count => this._unreadCount.next(count));
  }

  markRead(id: string): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Decrement local count
        const current = this._unreadCount.getValue();
        if (current > 0) this._unreadCount.next(current - 1);
      }),
      map(() => void 0),
      catchError(err => {
        this.logger.error(`NotificationService: markRead(${id}) failed`, err);
        return of(void 0);
      })
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => this._unreadCount.next(0)),
      map(() => void 0),
      catchError(err => {
        this.logger.error('NotificationService: markAllRead failed', err);
        return of(void 0);
      })
    );
  }
}
