import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';

export interface OvertimeSchedule {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;   // ISO date string
  note?: string;
  createdAt: string;
}

export interface CreateOvertimeScheduleRequest {
  employeeId: string;
  date: string;   // ISO date
  note?: string;
}

export interface CreateBulkOvertimeScheduleRequest {
  employeeId: string;
  dates: string[];
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class OvertimeScheduleService {
  private apiUrl = `${environment.apiUrl}/attendance/overtime-schedule`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  getByMonth(monthKey: string, employeeId?: string): Observable<OvertimeSchedule[]> {
    let url = `${this.apiUrl}?month=${encodeURIComponent(monthKey)}`;
    if (employeeId) url += `&employeeId=${encodeURIComponent(employeeId)}`;
    return this.http.get<ApiResponse<OvertimeSchedule[]>>(url).pipe(
      map(res => res.data ?? []),
      catchError(err => { this.logger.error('OvertimeScheduleService:getByMonth failed', err); return throwError(() => err); })
    );
  }

  create(req: CreateOvertimeScheduleRequest): Observable<OvertimeSchedule> {
    return this.http.post<ApiResponse<OvertimeSchedule>>(this.apiUrl, req).pipe(
      map(res => res.data),
      catchError(err => { this.logger.error('OvertimeScheduleService:create failed', err); return throwError(() => err); })
    );
  }

  createBulk(req: CreateBulkOvertimeScheduleRequest): Observable<OvertimeSchedule[]> {
    return this.http.post<ApiResponse<OvertimeSchedule[]>>(`${this.apiUrl}/bulk`, req).pipe(
      map(res => res.data ?? []),
      catchError(err => { this.logger.error('OvertimeScheduleService:createBulk failed', err); return throwError(() => err); })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).pipe(
      map(() => void 0),
      catchError(err => { this.logger.error('OvertimeScheduleService:delete failed', err); return throwError(() => err); })
    );
  }
}
