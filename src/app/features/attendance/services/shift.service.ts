import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { Shift, CreateShift, UpdateShift } from '../models/shift.model';
import { LoggerService } from '@core/services/logger.service';

export { Shift, CreateShift, UpdateShift } from '../models/shift.model';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private apiUrl = `${environment.apiUrl}/shifts`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  // Optimized for dropdowns
  getShifts(): Observable<Shift[]> {
    return this.http.get<ApiResponse<Shift[]>>(`${this.apiUrl}/lookup`).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error('ShiftService: getShifts failed', err); return throwError(() => err); })
    );
  }

  // Full paged list for management UI
  getShiftsPaged(pagination: Partial<{ pageNumber: number; pageSize: number }> = {}): Observable<PagedResult<Shift>> {
    return this.http.get<ApiResponse<PagedResult<Shift>>>(this.apiUrl, { params: pagination }).pipe(
      map(response => response.data || { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false }),
      catchError(err => { this.logger.error('ShiftService: getShiftsPaged failed', err); return throwError(() => err); })
    );
  }

  getShiftById(id: string): Observable<Shift> {
    return this.http.get<ApiResponse<Shift>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`ShiftService: getShiftById(${id}) failed`, err); return throwError(() => err); })
    );
  }

  createShift(shift: CreateShift): Observable<string> {
    return this.http.post<ApiResponse<string>>(this.apiUrl, shift).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('ShiftService: createShift failed', err); return throwError(() => err); })
    );
  }

  updateShift(id: string, shift: UpdateShift): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, shift).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`ShiftService: updateShift(${id}) failed`, err); return throwError(() => err); })
    );
  }

  deleteShift(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`ShiftService: deleteShift(${id}) failed`, err); return throwError(() => err); })
    );
  }
}
