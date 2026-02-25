import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';
import { PerformanceReview, PerformanceGoal } from '../models/performance.model';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private apiUrl = `${environment.apiUrl}/performance`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  getEmployeeGoals(employeeId: string): Observable<PerformanceGoal[]> {
    return this.http.get<ApiResponse<PerformanceGoal[]>>(`${this.apiUrl}/goals/${employeeId}`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`Failed to fetch goals for employee ${employeeId}`, err);
        return of([]);
      })
    );
  }

  createGoal(goal: Partial<PerformanceGoal>): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/goals`, goal).pipe(
      map(res => res.data || ''),
      catchError(err => {
        this.logger.error('Failed to create performance goal', err);
        return of('');
      })
    );
  }

  updateGoalProgress(id: string, progress: number): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/goals/${id}/progress`, progress).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update progress for goal ${id}`, err);
        return of(false);
      })
    );
  }

  getEmployeeReviews(employeeId: string): Observable<PerformanceReview[]> {
    return this.http.get<ApiResponse<PerformanceReview[]>>(`${this.apiUrl}/reviews/${employeeId}`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`Failed to fetch reviews for employee ${employeeId}`, err);
        return of([]);
      })
    );
  }

  createReview(review: Partial<PerformanceReview>): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/reviews`, review).pipe(
      map(res => res.data || ''),
      catchError(err => {
        this.logger.error('Failed to create performance review', err);
        return of('');
      })
    );
  }

  updateReview(id: string, review: Partial<PerformanceReview>): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/reviews/${id}`, review).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update performance review ${id}`, err);
        return of(false);
      })
    );
  }
}
