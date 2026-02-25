import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';
import { AuditLog } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private apiUrl = `${environment.apiUrl}/auditlogs`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getAuditLogs(
    pageNumber: number = 1,
    pageSize: number = 20,
    searchTerm: string = '',
    startDate?: string,
    endDate?: string,
    actionType?: string
  ): Observable<PagedResult<AuditLog>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    if (actionType) {
      params = params.set('actionType', actionType);
    }

    return this.http.get<ApiResponse<PagedResult<AuditLog>>>(this.apiUrl, { params }).pipe(
      map(response => response.data),
      catchError(error => {
        this.logger.error('Error fetching audit logs', error);
        return throwError(() => error);
      })
    );
  }
}
