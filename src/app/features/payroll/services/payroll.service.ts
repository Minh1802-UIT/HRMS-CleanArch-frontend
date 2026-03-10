import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { Payroll, AnnualTaxReport } from '../models/payroll.model';
import { LoggerService } from '@core/services/logger.service';
import { formatMonthYear } from '@shared/utils/date.utils';

export { Payroll, PayrollRecord } from '../models/payroll.model';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private apiUrl = `${environment.apiUrl}/payrolls`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getPayrollData(month: string, year: number): Observable<Payroll[]> {
    const monthYear = formatMonthYear(month, year);
    return this.http.get<ApiResponse<PagedResult<Payroll>>>(`${this.apiUrl}?month=${monthYear}&pageSize=200`).pipe(
      map(response => {
        if (response.data && response.data.items) {
          return response.data.items;
        }
        return (response.data as unknown as Payroll[]) || [];
      }),
      catchError(err => { this.logger.error('PayrollService: getPayrollData failed', err); return throwError(() => err); })
    );
  }

  calculatePayroll(month: string, year: number): Observable<number> {
    const monthYear = formatMonthYear(month, year);
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/generate`, { month: monthYear }).pipe(
      map(response => {
        const match = (response.data || '').match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }),
      catchError(err => { this.logger.error('PayrollService: calculatePayroll failed', err); return throwError(() => err); })
    );
  }

  updateStatus(id: string, status: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${id}/status`, { id, status }).pipe(
      map(() => void 0),
      catchError(err => { this.logger.error(`PayrollService: updateStatus(${id}, ${status}) failed`, err); return throwError(() => err); })
    );
  }

  downloadPayslip(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' }).pipe(
      catchError(err => { this.logger.error(`PayrollService: downloadPayslip(${id}) failed`, err); return throwError(() => err); })
    );
  }

  exportPayroll(monthYear: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?month=${monthYear}`, { responseType: 'blob' }).pipe(
      catchError(err => { this.logger.error('PayrollService: exportPayroll failed', err); return throwError(() => err); })
    );
  }

  /** NEW-7: Annual PIT Tax Report — GET /api/payrolls/tax-report/{year} */
  getTaxReport(year: number): Observable<AnnualTaxReport> {
    return this.http.get<ApiResponse<AnnualTaxReport>>(`${this.apiUrl}/tax-report/${year}`).pipe(
      map(res => res.data!),
      catchError(err => {
        this.logger.error(`PayrollService: getTaxReport(${year}) failed`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * GET /api/payrolls/me — returns the current user's own payroll history.
   * Available to all authenticated users (no Admin/HR role required).
   */
  getMyPayrolls(): Observable<Payroll[]> {
    return this.http.get<ApiResponse<Payroll[]>>(`${this.apiUrl}/me`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('PayrollService: getMyPayrolls failed', err);
        return throwError(() => err);
      })
    );
  }

  getEmployeePayrolls(employeeId: string): Observable<Payroll[]> {
    return this.http.get<ApiResponse<Payroll[]>>(`${this.apiUrl}/employee/${employeeId}`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`PayrollService: getEmployeePayrolls(${employeeId}) failed`, err);
        return throwError(() => err);
      })
    );
  }

}
