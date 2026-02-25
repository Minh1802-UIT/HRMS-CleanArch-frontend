import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { Department } from '../models/department.model';
import { LoggerService } from '@core/services/logger.service';

export { Department } from '../models/department.model';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/departments`;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getDepartments(): Observable<Department[]> {
    return this.http.get<ApiResponse<PagedResult<Department>>>(this.apiUrl).pipe(
      map(response => response.data?.items || []),
      catchError(err => { this.logger.error('DepartmentService: getDepartments failed', err); return throwError(() => err); })
    );
  }

  getDepartment(id: string): Observable<Department> {
    return this.http.get<ApiResponse<Department>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`DepartmentService: getDepartment(${id}) failed`, err); return throwError(() => err); })
    );
  }

  createDepartment(dept: Department): Observable<Department> {
    return this.http.post<ApiResponse<Department>>(this.apiUrl, dept).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('DepartmentService: createDepartment failed', err); return throwError(() => err); })
    );
  }

  updateDepartment(id: string, dept: Department): Observable<Department> {
    return this.http.put<ApiResponse<Department>>(`${this.apiUrl}/${id}`, dept).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`DepartmentService: updateDepartment(${id}) failed`, err); return throwError(() => err); })
    );
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error(`DepartmentService: deleteDepartment(${id}) failed`, err); return throwError(() => err); })
    );
  }
}
