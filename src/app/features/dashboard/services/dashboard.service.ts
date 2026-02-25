import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { DashboardData } from '../models/dashboard.model';
import { LoggerService } from '@core/services/logger.service';

export { SummaryCard, AttendanceTrend, RecruitmentStats, JobVacancy, OngoingProcess, DashboardEvent, DashboardLeave, Interview, NewHire, PendingRequest, DashboardData, DashboardAnalytics } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<ApiResponse<DashboardData>>(this.apiUrl)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.logger.error('DashboardService: getDashboardData failed', err);
          return throwError(() => err);
        })
      );
  }
}
