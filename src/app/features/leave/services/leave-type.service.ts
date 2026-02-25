import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { LeaveType } from '../models/leave-type.model';
import { LoggerService } from '@core/services/logger.service';

export { LeaveType } from '../models/leave-type.model';

@Injectable({
  providedIn: 'root'
})
export class LeaveTypeService {
  private apiUrl = `${environment.apiUrl}/leave-types`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getAll(): Observable<LeaveType[]> {
    return this.http.get<ApiResponse<PagedResult<LeaveType>>>(this.apiUrl).pipe(
      map(res => (res.data as PagedResult<LeaveType>)?.items || (res.data as unknown as LeaveType[]) || []),
      catchError(err => {
        this.logger.error('LeaveTypeService: getAll failed', err);
        return throwError(() => err);
      })
    );
  }
}
