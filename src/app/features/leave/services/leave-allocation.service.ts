import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { PaginationParams } from '@core/models/user.model';
import { LoggerService } from '@core/services/logger.service';
import { LeaveAllocationDto } from '../models/leave-allocation.model';

@Injectable({
  providedIn: 'root'
})
export class LeaveAllocationService {
  private apiUrl = `${environment.apiUrl}/leave-allocations`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  initializeAllocation(employeeId: string, year: number): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/initialize/${year}?employeeId=${employeeId}`, {}).pipe(
      map(response => response.message || 'Initialized successfully'),
      catchError(err => {
        this.logger.error('LeaveAllocationService: initializeAllocation failed', err);
        return throwError(() => err);
      })
    );
  }

  getBalance(employeeId: string, typeId: string, year: number): Observable<LeaveAllocationDto | undefined> {
    return this.http.get<ApiResponse<LeaveAllocationDto[]>>(`${this.apiUrl}/employee/${employeeId}`).pipe(
        map(res => {
            if (res.data && Array.isArray(res.data)) {
                return res.data.find((a: LeaveAllocationDto) => a.leaveTypeId === typeId);
            }
            return undefined;
        }),
        catchError(err => {
          this.logger.error('LeaveAllocationService: getBalance failed', err);
          return throwError(() => err);
        })
    );
  }

  getAllAllocations(pagination: PaginationParams, keyword: string = ''): Observable<PagedResult<LeaveAllocationDto>> {
    const payload = { ...pagination, keyword };
    return this.http.post<ApiResponse<PagedResult<LeaveAllocationDto>>>(`${this.apiUrl}/list`, payload).pipe(
      map(response => response.data),
      catchError(err => {
        this.logger.error('LeaveAllocationService: getAllAllocations failed', err);
        return throwError(() => err);
      })
    );
  }

  getAllocationsForEmployee(employeeId: string): Observable<LeaveAllocationDto[]> {
    return this.http.get<ApiResponse<LeaveAllocationDto[]>>(`${this.apiUrl}/employee/${employeeId}`).pipe(
        map(res => {
            if (res.data && Array.isArray(res.data)) {
                return res.data;
            }
            return [];
        }),
        catchError(err => {
          this.logger.error('LeaveAllocationService: getAllocationsForEmployee failed', err);
          return throwError(() => err);
        })
    );
  }
}
