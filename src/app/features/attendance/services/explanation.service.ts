import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';

export interface AttendanceExplanation {
  id: string;
  employeeId: string;
  employeeName?: string;
  workDate: string;       // ISO date string
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SubmitExplanationRequest {
  workDate: string;   // ISO date string
  reason: string;
}

export interface ReviewExplanationRequest {
  action: 'Approve' | 'Reject';
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class ExplanationService {
  private apiUrl = `${environment.apiUrl}/attendance/explanation`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  /** Employee submits an explanation for a forgotten check-out day */
  submit(workDate: Date, reason: string): Observable<AttendanceExplanation> {
    const body: SubmitExplanationRequest = {
      workDate: workDate.toISOString(),
      reason
    };
    return this.http
      .post<ApiResponse<AttendanceExplanation>>(this.apiUrl, body)
      .pipe(
        map(res => res.data),
        catchError(err => {
          this.logger.error('ExplanationService: submit failed', err);
          return throwError(() => err);
        })
      );
  }

  /** Employee gets their own explanation history */
  getMyExplanations(): Observable<AttendanceExplanation[]> {
    return this.http
      .get<ApiResponse<AttendanceExplanation[]>>(`${this.apiUrl}/me`)
      .pipe(
        map(res => res.data ?? []),
        catchError(err => {
          this.logger.error('ExplanationService: getMyExplanations failed', err);
          return throwError(() => err);
        })
      );
  }

  /** Manager/HR gets all pending explanations */
  getPending(): Observable<AttendanceExplanation[]> {
    return this.http
      .get<ApiResponse<AttendanceExplanation[]>>(`${this.apiUrl}/pending`)
      .pipe(
        map(res => res.data ?? []),
        catchError(err => {
          this.logger.error('ExplanationService: getPending failed', err);
          return throwError(() => err);
        })
      );
  }

  /** Manager/HR approves or rejects an explanation */
  review(id: string, action: 'Approve' | 'Reject', note?: string): Observable<AttendanceExplanation> {
    const body: ReviewExplanationRequest = { action, note };
    return this.http
      .put<ApiResponse<AttendanceExplanation>>(`${this.apiUrl}/${id}/review`, body)
      .pipe(
        map(res => res.data),
        catchError(err => {
          this.logger.error('ExplanationService: review failed', err);
          return throwError(() => err);
        })
      );
  }
}
