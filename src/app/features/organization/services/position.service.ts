import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { Position, PositionTreeNode } from '../models/position.model';
import { LoggerService } from '@core/services/logger.service';

export { Position, PositionTreeNode } from '../models/position.model';

@Injectable({
  providedIn: 'root'
})
export class PositionService {
  private apiUrl = `${environment.apiUrl}/positions`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getPositions(): Observable<Position[]> {
    return this.http.get<ApiResponse<PagedResult<Position>>>(this.apiUrl).pipe(
      map(response => response.data?.items || []),
      catchError(err => { this.logger.error('PositionService: getPositions failed', err); return throwError(() => err); })
    );
  }

  getPosition(id: string): Observable<Position> {
    return this.http.get<ApiResponse<Position>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`PositionService: getPosition(${id}) failed`, err); return throwError(() => err); })
    );
  }

  getPositionTree(): Observable<PositionTreeNode[]> {
    return this.http.get<ApiResponse<PositionTreeNode[]>>(`${this.apiUrl}/tree`).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error('PositionService: getPositionTree failed', err); return throwError(() => err); })
    );
  }

  getByDepartment(departmentId: string): Observable<Position[]> {
    return this.http.get<ApiResponse<Position[]>>(`${this.apiUrl}/department/${departmentId}`).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error(`PositionService: getByDepartment(${departmentId}) failed`, err); return throwError(() => err); })
    );
  }

  createPosition(pos: Position): Observable<Position> {
    return this.http.post<ApiResponse<Position>>(this.apiUrl, pos).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('PositionService: createPosition failed', err); return throwError(() => err); })
    );
  }

  updatePosition(id: string, pos: Position): Observable<Position> {
    return this.http.put<ApiResponse<Position>>(`${this.apiUrl}/${id}`, pos).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`PositionService: updatePosition(${id}) failed`, err); return throwError(() => err); })
    );
  }

  deletePosition(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`PositionService: deletePosition(${id}) failed`, err); return throwError(() => err); })
    );
  }
}
