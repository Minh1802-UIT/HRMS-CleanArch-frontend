import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { AttendanceRecord, DailyStats, AttendanceStatus } from '../models/attendance.model';

export { AttendanceRecord, DailyStats } from '../models/attendance.model';

/** Raw DTO from the attendance API before mapping to AttendanceRecord */
interface AttendanceRawDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  avatarUrl?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours: number;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) { }

  getDailyRecords(date: Date, params: { pageSize: number; pageNumber: number } = { pageSize: 10, pageNumber: 1 }): Observable<PagedResult<AttendanceRecord>> {
    const dateStr = this.formatDate(date);
    return this.http.post<ApiResponse<PagedResult<AttendanceRawDto>>>(`${this.apiUrl}/daily/${dateStr}`, params).pipe(
        map(response => {
            const data = response.data;
            const items = (data.items || []).map((dto: AttendanceRawDto) => ({
                id: 'REF-' + dto.employeeId,
                date: new Date(dto.date),
                employee: {
                    id: dto.employeeId,
                    employeeCode: dto.employeeCode,
                    name: dto.employeeName,
                    avatar: dto.avatarUrl || 'assets/images/defaults/avatar-1.png'
                },
                checkIn: dto.checkIn ? new Date(dto.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                checkOut: dto.checkOut ? new Date(dto.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                workingHours: dto.workingHours,
                status: (dto.status || AttendanceStatus.Absent) as AttendanceStatus
            }));

            return {
                ...data,
                items: items
            };
        }),
        catchError(err => {
            this.logger.error('Failed to fetch attendance', err);
            return of({
                items: [],
                totalCount: 0,
                pageNumber: 1,
                pageSize: 10,
                totalPages: 1,
                hasNext: false,
                hasPrevious: false
            });
        })
    );
  }

  checkIn(employeeId: string): Observable<string> {
      return this.http.post<ApiResponse<string>>(`${this.apiUrl}/check-in`, { EmployeeId: employeeId }).pipe(
          map(res => res.message),
          catchError(err => {
              const msg = err.error?.message || 'Check-in failed';
              this.logger.error('AttendanceService: checkIn failed', err);
              return throwError(() => new Error(msg));
          })
      );
  }

  checkOut(employeeId: string): Observable<string> {
      return this.http.post<ApiResponse<string>>(`${this.apiUrl}/check-out`, { EmployeeId: employeeId, Type: 'CheckOut' }).pipe(
          map(res => res.message),
          catchError(err => {
              const msg = err.error?.message || 'Check-out failed';
              this.logger.error('AttendanceService: checkOut failed', err);
              return throwError(() => new Error(msg));
          })
      );
  }

  processAttendance(): Observable<string> {
      return this.http.post<ApiResponse<void>>(`${this.apiUrl}/process-logs`, {}).pipe(
          map(res => res.message || 'Processed successfully'),
          catchError(err => {
              const msg = err.error?.message || 'Processing failed';
              this.logger.error('AttendanceService: processAttendance failed', err);
              return throwError(() => new Error(msg));
          })
      );
  }

  getDailyStats(): Observable<DailyStats> {
      const today = this.formatDate(new Date());
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/daily/${today}`, { pageSize: 999, pageNumber: 1 }).pipe(
          map(response => {
              const data = response.data;
              // Backend returns PagedResult with items array, not a flat array
              const records: { status: string }[] = data?.items || data || [];
              return {
                  present: records.filter(r => r.status === 'Present').length,
                  late: records.filter(r => r.status === 'Late').length,
                  absent: records.filter(r => r.status === 'Absent').length,
                  onLeave: records.filter(r => r.status === 'OnLeave' || r.status === 'On Leave').length
              };
          }),
          catchError(err => {
              this.logger.error('Failed to fetch stats', err);
              return of({ present: 0, late: 0, absent: 0, onLeave: 0 });
          })
      );
  }

  /** Format Date to yyyy-MM-dd string for URL-safe usage */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getMyAttendanceRange(from: string, to: string): Observable<AttendanceRecord[]> {
      return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.apiUrl}/me/range?from=${from}&to=${to}`).pipe(
          map(res => res.data || []),
          catchError(err => {
              this.logger.error('Failed to fetch my attendance', err);
              return of([]);
          })
      );
  }

  getTeamSummary(from: string, to: string): Observable<AttendanceRecord[]> {
      return this.http.get<ApiResponse<AttendanceRecord[]>>(`${this.apiUrl}/team/summary?from=${from}&to=${to}`).pipe(
          map(res => res.data || []),
          catchError(err => {
              this.logger.error('Failed to fetch team summary', err);
              return of([]);
          })
      );
  }
}
