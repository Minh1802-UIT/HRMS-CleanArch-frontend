import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';
import { LeaveRequest, LeaveStatus } from '../models/leave-request.model';

export { LeaveRequest, LeaveStatus } from '../models/leave-request.model';

/** Raw DTO as returned by the Leave API before mapping to the frontend model */
interface LeaveRequestRawDto {
  id: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  avatarUrl?: string;
  leaveType?: string;
  type?: string;
  fromDate?: string;
  startDate?: string;
  toDate?: string;
  endDate?: string;
  totalDays?: number;
  days?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
  requestDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveRequestService {
  private apiUrl = `${environment.apiUrl}/leaves`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) { }

  getLeaveHistory(): Observable<LeaveRequest[]> {
    return this.http.get<ApiResponse<LeaveRequestRawDto[]>>(`${this.apiUrl}/me`).pipe(
        map(response => (response.data || []).map(item => this.mapToModel(item))),
        catchError(err => {
            this.logger.error('Get leave history failed', err);
            return of([]);
        })
    );
  }

  getAllRequests(): Observable<LeaveRequest[]> {
      return this.http.post<ApiResponse<PagedResult<LeaveRequestRawDto>>>(`${this.apiUrl}/list`, {}).pipe(
        map(response => (response.data?.items || []).map((item: LeaveRequestRawDto) => this.mapToModel(item))),
        catchError(err => {
            this.logger.error('Get all leave requests failed', err);
            return of([]);
        })
    );
  }

  submitRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'requestDate'>): Observable<boolean> {
     const dto = {
         LeaveType: request.type,
         FromDate: request.startDate,
         ToDate: request.endDate,
         Reason: request.reason
     };
     return this.http.post<ApiResponse<void>>(`${this.apiUrl}`, dto).pipe(
         map(response => response.succeeded)
     );
  }

  approveRequest(id: string, comment?: string): Observable<boolean> {
      return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}/review`, {
        id: id,
        status: 'Approved',
        managerComment: comment || 'Approved via UI'
      }).pipe(
           map(response => response.succeeded),
           catchError(() => of(false))
      );
  }

  rejectRequest(id: string, comment?: string): Observable<boolean> {
      return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}/review`, {
        id: id,
        status: 'Rejected',
        managerComment: comment || 'Rejected via UI'
      }).pipe(
           map(response => response.succeeded),
           catchError(() => of(false))
      );
  }

  private mapToModel(item: LeaveRequestRawDto): LeaveRequest {
      return {
          id: item.id,
          employeeId: item.employeeId,
          employeeCode: item.employeeCode || 'N/A',
          employeeName: item.employeeName || 'Unknown',
          avatarUrl: item.avatarUrl,
          type: item.leaveType || item.type || 'Unknown',
          startDate: new Date(item.fromDate || item.startDate || new Date()),
          endDate: new Date(item.toDate || item.endDate || new Date()),
          days: item.totalDays || item.days || 0,
          reason: item.reason || '',
          status: (item.status || 'Pending') as LeaveStatus,
          requestDate: new Date(item.createdAt || item.requestDate || new Date())
      };
  }
}
