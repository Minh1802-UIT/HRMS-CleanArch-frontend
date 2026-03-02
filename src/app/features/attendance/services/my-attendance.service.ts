import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';

export interface DailyLogEntry {
  date: string;
  dayOfWeek: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  shiftCode: string;
  workingHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  overtimeHours: number;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface MonthlyAttendanceReport {
  employeeId: string;
  month: string; // "MM-yyyy"
  totalPresent: number;
  totalLate: number;
  totalWorkingHours: number;
  logs: DailyLogEntry[];
}

export interface AttendanceRangeReport {
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  logs: DailyLogEntry[];
}

export interface CheckInRequest {
  type: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class MyAttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  /** Check-in for the currently logged-in employee */
  checkIn(req: CheckInRequest = { type: 'CheckIn', deviceId: 'WebApp' }): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(`${this.apiUrl}/check-in`, { ...req, Type: 'CheckIn' })
      .pipe(
        map(res => res.message || res.data || 'Checked in successfully'),
        catchError(err => {
          const msg = err.error?.message || 'Check-in failed';
          this.logger.error('MyAttendanceService: checkIn failed', err);
          return throwError(() => new Error(msg));
        })
      );
  }

  /** Check-out for the currently logged-in employee */
  checkOut(req: CheckInRequest = { type: 'CheckOut', deviceId: 'WebApp' }): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(`${this.apiUrl}/check-out`, { ...req, Type: 'CheckOut' })
      .pipe(
        map(res => res.message || res.data || 'Checked out successfully'),
        catchError(err => {
          const msg = err.error?.message || 'Check-out failed';
          this.logger.error('MyAttendanceService: checkOut failed', err);
          return throwError(() => new Error(msg));
        })
      );
  }

  /** Get monthly report for the logged-in employee. month format: "MM-yyyy" */
  getMyMonthlyReport(month?: string): Observable<MonthlyAttendanceReport> {
    const m = month ?? this.currentMonthStr();
    return this.http
      .get<ApiResponse<MonthlyAttendanceReport>>(`${this.apiUrl}/me/report`, {
        params: { month: m }
      })
      .pipe(
        map(res => res.data),
        catchError(err => {
          this.logger.error('MyAttendanceService: getMyMonthlyReport failed', err);
          return throwError(() => err);
        })
      );
  }

  /** Get attendance for a custom date range. from/to are ISO date strings. */
  getMyRange(from: Date, to: Date): Observable<AttendanceRangeReport> {
    return this.http
      .get<ApiResponse<AttendanceRangeReport>>(`${this.apiUrl}/me/range`, {
        params: {
          from: from.toISOString(),
          to: to.toISOString()
        }
      })
      .pipe(
        map(res => res.data),
        catchError(err => {
          this.logger.error('MyAttendanceService: getMyRange failed', err);
          return throwError(() => err);
        })
      );
  }

  private currentMonthStr(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${yyyy}`;
  }
}
