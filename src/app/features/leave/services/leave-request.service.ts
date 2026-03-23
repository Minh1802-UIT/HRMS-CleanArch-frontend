import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
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

export interface LeaveRequestFilters {
  status?: string;
  employeeId?: string;
  leaveType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveRequestService {
  private apiUrl = `${environment.apiUrl}/leaves`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService,
    private toastService: ToastService
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

  getAllRequests(filters?: LeaveRequestFilters): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.employeeId) params = params.set('employeeId', filters.employeeId);
    if (filters?.leaveType) params = params.set('leaveType', filters.leaveType);

    return this.http.get<ApiResponse<PagedResult<LeaveRequestRawDto>>>(this.apiUrl, { params }).pipe(
      map(response => (response.data?.items || []).map((item: LeaveRequestRawDto) => this.mapToModel(item))),
      catchError(err => {
        this.logger.error('Get all leave requests failed', err);
        this.toastService.showError('Error', 'Failed to load leave requests. Please try again.');
        return of([]);
      })
    );
  }

  getEmployeeLeaves(employeeId: string): Observable<LeaveRequest[]> {
    return this.http.get<ApiResponse<LeaveRequestRawDto[]>>(`${this.apiUrl}/employee/${employeeId}`).pipe(
      map(response => (response.data || []).map(item => this.mapToModel(item))),
      catchError(err => {
        this.logger.error(`Get leave requests for employee ${employeeId} failed`, err);
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
      catchError(err => {
        this.logger.error('Failed to approve leave request', err);
        this.toastService.showError('Error', err?.error?.message || 'Failed to approve leave request. Please try again.');
        return of(false);
      })
    );
  }

  rejectRequest(id: string, comment?: string): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}/review`, {
      id: id,
      status: 'Rejected',
      managerComment: comment || 'Rejected via UI'
    }).pipe(
      map(response => response.succeeded),
      catchError(err => {
        this.logger.error('Failed to reject leave request', err);
        this.toastService.showError('Error', err?.error?.message || 'Failed to reject leave request. Please try again.');
        return of(false);
      })
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
