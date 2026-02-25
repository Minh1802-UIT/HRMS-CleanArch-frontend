import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { JobVacancy, Candidate } from '../models/recruitment.model';
import { LoggerService } from '@core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {
  private apiUrl = `${environment.apiUrl}/recruitment`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  getVacancies(): Observable<JobVacancy[]> {
    return this.http.get<ApiResponse<JobVacancy[]>>(`${this.apiUrl}/vacancies`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch vacancies', err);
        return of([]);
      })
    );
  }

  getVacancyById(id: string): Observable<JobVacancy | null> {
    return this.http.get<ApiResponse<JobVacancy>>(`${this.apiUrl}/vacancies/${id}`).pipe(
      map(res => res.data),
      catchError(err => {
        this.logger.error(`Failed to fetch vacancy ${id}`, err);
        return of(null);
      })
    );
  }

  getCandidatesByVacancy(vacancyId: string): Observable<Candidate[]> {
    return this.http.get<ApiResponse<Candidate[]>>(`${this.apiUrl}/candidates/by-vacancy/${vacancyId}`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error(`Failed to fetch candidates for vacancy ${vacancyId}`, err);
        return of([]);
      })
    );
  }

  getCandidateById(id: string): Observable<Candidate | null> {
    return this.http.get<ApiResponse<Candidate>>(`${this.apiUrl}/candidates/${id}`).pipe(
      map(res => res.data),
      catchError(err => {
        this.logger.error(`Failed to fetch candidate ${id}`, err);
        return of(null);
      })
    );
  }

  updateCandidateStatus(id: string, status: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}/status`, { status }).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update status for candidate ${id}`, err);
        return of(false);
      })
    );
  }

  // =====================================================================
  //  Vacancy CRUD
  // =====================================================================

  createVacancy(dto: Partial<JobVacancy>): Observable<JobVacancy | null> {
    return this.http.post<ApiResponse<JobVacancy>>(`${this.apiUrl}/vacancies`, dto).pipe(
      map(res => res.data),
      catchError(err => {
        this.logger.error('Failed to create vacancy', err);
        return of(null);
      })
    );
  }

  updateVacancy(id: string, dto: Partial<JobVacancy>): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/vacancies/${id}`, dto).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update vacancy ${id}`, err);
        return of(false);
      })
    );
  }

  deleteVacancy(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/vacancies/${id}`).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to delete vacancy ${id}`, err);
        return of(false);
      })
    );
  }

  // =====================================================================
  //  Candidate CRUD
  // =====================================================================

  getAllCandidates(): Observable<Candidate[]> {
    return this.http.get<ApiResponse<Candidate[]>>(`${this.apiUrl}/candidates`).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch all candidates', err);
        return of([]);
      })
    );
  }

  createCandidate(dto: Partial<Candidate>): Observable<Candidate | null> {
    return this.http.post<ApiResponse<Candidate>>(`${this.apiUrl}/candidates`, dto).pipe(
      map(res => res.data),
      catchError(err => {
        this.logger.error('Failed to create candidate', err);
        return of(null);
      })
    );
  }

  updateCandidate(id: string, dto: Partial<Candidate>): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}`, dto).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update candidate ${id}`, err);
        return of(false);
      })
    );
  }

  deleteCandidate(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}`).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to delete candidate ${id}`, err);
        return of(false);
      })
    );
  }

  onboardCandidate(id: string, onboardData: { employeeId?: string; startDate?: string }): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}/onboard`, onboardData).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to onboard candidate ${id}`, err);
        return of(false);
      })
    );
  }
}
