import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { Payroll, AnnualTaxReport } from '../models/payroll.model';
import { LoggerService } from '@core/services/logger.service';

export { Payroll, PayrollRecord } from '../models/payroll.model';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private apiUrl = `${environment.apiUrl}/payrolls`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getPayrollData(month: string, year: number): Observable<Payroll[]> {
    const monthYear = this.formatMonthYear(month, year);
    return this.http.get<ApiResponse<PagedResult<Payroll>>>(`${this.apiUrl}?month=${monthYear}`).pipe(
      map(response => {
        if (response.data && response.data.items) {
          return response.data.items;
        }
        return (response.data as unknown as Payroll[]) || [];
      }),
      catchError(err => { this.logger.error('PayrollService: getPayrollData failed', err); return throwError(() => err); })
    );
  }

  calculatePayroll(month: string, year: number): Observable<Payroll[]> {
     const monthYear = this.formatMonthYear(month, year);
     return this.http.post<ApiResponse<Payroll[]>>(`${this.apiUrl}/generate`, { month: monthYear }).pipe(
       map(response => response.data || []),
       catchError(err => { this.logger.error('PayrollService: calculatePayroll failed', err); return throwError(() => err); })
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

  private formatMonthYear(monthName: string, year: number): string {
    const monthNum = this.getMonthNumber(monthName);
    return `${monthNum}-${year}`;
  }

  private getMonthNumber(monthName: string): string {
    const months: { [key: string]: string } = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    return months[monthName] || '01';
  }
}
