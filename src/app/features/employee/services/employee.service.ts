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

  /** sessionStorage key prefix for persisted employee detail (survives F5 within same session) */
  private readonly SS_KEY_PREFIX = 'emp_';
  private readonly SS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

  /** In-memory cache for list queries (30 s — covers back-navigation without extra API calls) */
  private listCache = new Map<string, { data: PagedResult<Employee>; expiry: number }>();
  private readonly LIST_CACHE_TTL_MS = 30 * 1000;

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getEmployees(params: { pageSize: number; pageNumber: number; searchTerm?: string; sortBy?: string } = { pageSize: 10, pageNumber: 1 }): Observable<PagedResult<Employee>> {
    const cacheKey = JSON.stringify(params);
    const listCached = this.listCache.get(cacheKey);
    if (listCached && Date.now() < listCached.expiry) {
      this.logger.debug('EmployeeService: list cache hit');
      return of(listCached.data);
    }
    const httpParams: Record<string, string> = {
      pageNumber: params.pageNumber.toString(),
      pageSize: params.pageSize.toString(),
    };
    if (params.searchTerm) httpParams['searchTerm'] = params.searchTerm;
    if (params.sortBy) httpParams['sortBy'] = params.sortBy;

    return this.http.get<ApiResponse<PagedResult<Employee>>>(`${this.apiUrl}`, { params: httpParams }).pipe(
      map(response => response.data),
      tap(data => this.listCache.set(cacheKey, { data, expiry: Date.now() + this.LIST_CACHE_TTL_MS })),
      catchError(err => { this.logger.error('EmployeeService: getEmployees failed', err); return throwError(() => err); })
    );
  }

  getLookup(keyword: string = '', limit?: number, departmentId?: string): Observable<Employee[]> {
    const params: Record<string, string> = {};
    if (keyword) params['keyword'] = keyword;
    if (limit && limit > 0) params['limit'] = limit.toString();
    if (departmentId) params['departmentId'] = departmentId;
    return this.http.get<ApiResponse<Array<{ id: string; label: string; secondaryLabel?: string }>>>(`${this.apiUrl}/lookup`, { params }).pipe(
      map(response => (response.data || []).map(item => ({
        id: item.id,
        fullName: item.label,
        employeeCode: '',
        positionId: item.secondaryLabel ?? '',
      } as unknown as Employee))),
      catchError(err => { this.logger.error('EmployeeService: getLookup failed', err); return throwError(() => err); })
    );
  }

  getEmployeeById(id: string): Observable<Employee> {
    // 1. Memory cache (fastest — same Angular session)
    const memoryCached = this.employeeCache.get(id);
    if (memoryCached && Date.now() < memoryCached.expiry) {
      this.logger.debug(`EmployeeService: memory cache hit for ${id}`);
      return of(memoryCached.data);
    }

    // 2. sessionStorage cache (survives F5 within same browser session)
    try {
      const ssRaw = sessionStorage.getItem(this.SS_KEY_PREFIX + id);
      if (ssRaw) {
        const ss = JSON.parse(ssRaw) as { data: Employee; expiry: number };
        if (Date.now() < ss.expiry) {
          this.logger.debug(`EmployeeService: sessionStorage cache hit for ${id}`);
          // Repopulate memory cache so subsequent calls are even faster
          this.employeeCache.set(id, { data: ss.data, expiry: ss.expiry });
          return of(ss.data);
        }
        sessionStorage.removeItem(this.SS_KEY_PREFIX + id);
      }
    } catch { /* sessionStorage unavailable (private mode, quota, etc.) */ }

    // 3. Fetch from API
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      tap(employee => {
        const memExpiry = Date.now() + this.CACHE_TTL_MS;
        this.employeeCache.set(id, { data: employee, expiry: memExpiry });
        try {
          sessionStorage.setItem(
            this.SS_KEY_PREFIX + id,
            JSON.stringify({ data: employee, expiry: Date.now() + this.SS_CACHE_TTL_MS })
          );
        } catch { /* sessionStorage full or unavailable */ }
      }),
      catchError(err => { this.logger.error(`EmployeeService: getEmployeeById(${id}) failed`, err); return throwError(() => err); })
    );
  }

  /** Call after updating/deleting an employee to ensure next load fetches fresh data */
  invalidateEmployeeCache(id: string): void {
    this.employeeCache.delete(id);
    this.listCache.clear(); // list counts/statuses may have changed
    try { sessionStorage.removeItem(this.SS_KEY_PREFIX + id); } catch { /* ignore */ }
  }

  addEmployee(employee: Omit<Employee, 'id' | 'version'>): Observable<Employee> {
    return this.http.post<ApiResponse<Employee>>(this.apiUrl, employee).pipe(
      map(response => response.data),
      tap(() => this.listCache.clear()),
      catchError(err => { this.logger.error('EmployeeService: addEmployee failed', err); return throwError(() => err); })
    );
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.http.patch<ApiResponse<Employee>>(`${this.apiUrl}/${id}`, employee).pipe(
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
