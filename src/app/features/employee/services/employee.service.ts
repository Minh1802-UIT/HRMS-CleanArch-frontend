import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { PagedResult } from '@core/models/api-response';
import { Employee } from '../models/employee.model';
import { OrgNode } from '../models/org-node.model';
import { LoggerService } from '@core/services/logger.service';

export { Employee } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/employees`;

  /** In-memory cache for employee detail (5 min TTL) */
  private employeeCache = new Map<string, { data: Employee; expiry: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getEmployees(params: { pageSize: number; pageNumber: number; searchTerm?: string; sortBy?: string } = { pageSize: 10, pageNumber: 1 }): Observable<PagedResult<Employee>> {
    return this.http.post<ApiResponse<PagedResult<Employee>>>(`${this.apiUrl}/list`, params).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('EmployeeService: getEmployees failed', err); return throwError(() => err); })
    );
  }

  getLookup(keyword: string = ''): Observable<Employee[]> {
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/lookup`, {
      params: keyword ? { keyword } : {}
    }).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error('EmployeeService: getLookup failed', err); return throwError(() => err); })
    );
  }

  getEmployeeById(id: string): Observable<Employee> {
    const cached = this.employeeCache.get(id);
    if (cached && Date.now() < cached.expiry) {
      this.logger.debug(`EmployeeService: cache hit for ${id}`);
      return of(cached.data);
    }
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      tap(employee => this.employeeCache.set(id, { data: employee, expiry: Date.now() + this.CACHE_TTL_MS })),
      catchError(err => { this.logger.error(`EmployeeService: getEmployeeById(${id}) failed`, err); return throwError(() => err); })
    );
  }

  /** Call after updating an employee to ensure next load fetches fresh data */
  invalidateEmployeeCache(id: string): void {
    this.employeeCache.delete(id);
  }

  addEmployee(employee: Omit<Employee, 'id' | 'version'>): Observable<Employee> {
    return this.http.post<ApiResponse<Employee>>(this.apiUrl, employee).pipe(
      map(response => response.data),
      catchError(err => { this.logger.error('EmployeeService: addEmployee failed', err); return throwError(() => err); })
    );
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<ApiResponse<Employee>>(`${this.apiUrl}/${id}`, employee).pipe(
      map(response => response.data),
      tap(() => this.invalidateEmployeeCache(id)),
      catchError(err => { this.logger.error(`EmployeeService: updateEmployee(${id}) failed`, err); return throwError(() => err); })
    );
  }

  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => this.invalidateEmployeeCache(id)),
      catchError(err => { this.logger.error(`EmployeeService: deleteEmployee(${id}) failed`, err); return throwError(() => err); })
    );
  }

  getOrgChart(): Observable<OrgNode[]> {
    return this.http.get<ApiResponse<OrgNode[]>>(`${this.apiUrl}/org-chart`).pipe(
      map(response => response.data || []),
      catchError(err => { this.logger.error('EmployeeService: getOrgChart failed', err); return throwError(() => err); })
    );
  }
}
