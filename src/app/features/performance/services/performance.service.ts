import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { PerformanceReview, PerformanceGoal } from '../models/performance.model';
import { PIP, PIPCreatePayload, PIPUpdateProgressPayload, PIPCompletePayload, PerformanceAnalytics } from '../models/performance.model';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private apiUrl = `${environment.apiUrl}/performance`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService,
    private toastService: ToastService
  ) {}

  getEmployeeGoals(employeeId: string): Observable<PerformanceGoal[]> {
    const endpoint = employeeId === 'all' ? `${this.apiUrl}/goals/all` : `${this.apiUrl}/goals/${employeeId}`;
    return this.http.get<ApiResponse<PerformanceGoal[]>>(endpoint).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`Failed to fetch goals for employee ${employeeId}`, err);
        return of([]);
      })
    );
  }

  getAllGoals(): Observable<PerformanceGoal[]> {
    return this.http.get<ApiResponse<PerformanceGoal[]>>(`${this.apiUrl}/goals/all`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch all goals', err);
        return of([]);
      })
    );
  }

  createGoal(goal: Partial<PerformanceGoal>): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/goals`, goal).pipe(
      map(res => res.data || ''),
      catchError(err => {
        this.logger.error('Failed to create performance goal', err);
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create performance goal.');
        return of('');
      })
    );
  }

  updateGoalProgress(id: string, progress: number): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/goals/${id}/progress`, progress).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update progress for goal ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update goal progress.');
        return of(false);
      })
    );
  }

  getEmployeeReviews(employeeId: string): Observable<PerformanceReview[]> {
    const endpoint = employeeId === 'all' ? `${this.apiUrl}/reviews/all` : `${this.apiUrl}/reviews/${employeeId}`;
    return this.http.get<ApiResponse<PerformanceReview[]>>(endpoint).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`Failed to fetch reviews for employee ${employeeId}`, err);
        return of([]);
      })
    );
  }

  getAllReviews(): Observable<PerformanceReview[]> {
    return this.http.get<ApiResponse<PerformanceReview[]>>(`${this.apiUrl}/reviews/all`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch all reviews', err);
        return of([]);
      })
    );
  }

  createReview(review: Partial<PerformanceReview>): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/reviews`, review).pipe(
      map(res => res.data || ''),
      catchError(err => {
        this.logger.error('Failed to create performance review', err);
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create performance review.');
        return of('');
      })
    );
  }

  updateReview(id: string, review: Partial<PerformanceReview>): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/reviews/${id}`, review).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update performance review ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update performance review.');
        return of(false);
      })
    );
  }

  // ===== PIP Methods =====

  getActivePIPs(): Observable<PIP[]> {
    return this.http.get<ApiResponse<PIP[]>>(`${this.apiUrl}/pip`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch active PIPs', err);
        return of([]);
      })
    );
  }

  getPIPById(id: string): Observable<PIP | null> {
    return this.http.get<ApiResponse<PIP>>(`${this.apiUrl}/pip/${id}`).pipe(
      map(res => res.data ?? null),
      catchError(err => {
        this.logger.error(`Failed to fetch PIP ${id}`, err);
        return of(null);
      })
    );
  }

  createPIP(payload: PIPCreatePayload): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/pip`, payload).pipe(
      map(res => res.data || ''),
      catchError(err => {
        this.logger.error('Failed to create PIP', err);
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create PIP.');
        return of('');
      })
    );
  }

  startPIP(id: string): Observable<boolean> {
    return this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/pip/${id}/start`, null).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to start PIP ${id}`, err);
        this.toastService.showError('Action Failed', err?.error?.message || 'Could not start PIP.');
        return of(false);
      })
    );
  }

  updatePIPProgress(id: string, payload: PIPUpdateProgressPayload): Observable<boolean> {
    return this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/pip/${id}/progress`, payload).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update PIP progress ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update PIP progress.');
        return of(false);
      })
    );
  }

  completePIP(id: string, payload: PIPCompletePayload): Observable<boolean> {
    return this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/pip/${id}/complete`, payload).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to complete PIP ${id}`, err);
        this.toastService.showError('Action Failed', err?.error?.message || 'Could not complete PIP.');
        return of(false);
      })
    );
  }

  cancelPIP(id: string, reason: string): Observable<boolean> {
    return this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/pip/${id}/cancel?reason=${encodeURIComponent(reason)}`, null).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to cancel PIP ${id}`, err);
        this.toastService.showError('Action Failed', err?.error?.message || 'Could not cancel PIP.');
        return of(false);
      })
    );
  }

  // ===== Analytics =====

  getAnalytics(): Observable<PerformanceAnalytics | null> {
    return this.http.get<ApiResponse<PerformanceAnalytics>>(`${this.apiUrl}/analytics`).pipe(
      map(res => res.data ?? null),
      catchError(err => {
        this.logger.error('Failed to fetch performance analytics', err);
        return of(null);
      })
    );
  }
}
