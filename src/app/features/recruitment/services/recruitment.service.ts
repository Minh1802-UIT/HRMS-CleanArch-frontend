import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import { JobVacancy, Candidate, Interview } from '../models/recruitment.model';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {
  private apiUrl = `${environment.apiUrl}/recruitment`;

  constructor(
    private http: HttpClient,
    private logger: LoggerService,
    private toastService: ToastService
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
    return this.http.get<ApiResponse<Candidate[]>>(`${this.apiUrl}/candidates`, { params: { vacancyId } }).pipe(
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
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}/status`, { status }).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update status for candidate ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update candidate status.');
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
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create vacancy.');
        return of(null);
      })
    );
  }

  updateVacancy(id: string, dto: Partial<JobVacancy>): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/vacancies/${id}`, dto).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update vacancy ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update vacancy.');
        return of(false);
      })
    );
  }

  deleteVacancy(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/vacancies/${id}`).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to delete vacancy ${id}`, err);
        this.toastService.showError('Delete Failed', err?.error?.message || 'Could not delete vacancy.');
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
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create candidate.');
        return of(null);
      })
    );
  }

  updateCandidate(id: string, dto: Partial<Candidate>): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}`, dto).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update candidate ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update candidate.');
        return of(false);
      })
    );
  }

  deleteCandidate(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}`).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to delete candidate ${id}`, err);
        this.toastService.showError('Delete Failed', err?.error?.message || 'Could not delete candidate.');
        return of(false);
      })
    );
  }

  // =====================================================================
  //  AI Integration
  // =====================================================================

  parseCv(file: File): Observable<{ firstName?: string, lastName?: string, email?: string, phoneNumber?: string, skills?: string[] } | null> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/candidates/parse-cv`, formData).pipe(
      map(res => res.data),
      catchError(err => {
        this.logger.error('Failed to parse CV with AI', err);
        this.toastService.showError('CV Parse Failed', err?.error?.message || 'Could not parse CV. Please try again or enter details manually.');
        return of(null);
      })
    );
  }

  scoreCandidate(candidateId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${candidateId}/score`, {}).pipe(
      map(res => {
        if (!res.succeeded) {
          throw new Error(res.message || 'Scoring failed');
        }
        return true;
      }),
      catchError(err => {
        this.logger.error(`Failed to score candidate ${candidateId} with AI`, err);
        const message = err?.error?.message || err?.message || 'An unknown error occurred';
        this.toastService.showError('AI Scoring Failed', message);
        return of(false);
      })
    );
  }

  // =====================================================================
  //  Onboarding
  // =====================================================================

  onboardCandidate(id: string, onboardData: {
    employeeCode?: string;
    departmentId?: string;
    positionId?: string;
    managerId?: string;
    joinDate?: string;
    dateOfBirth?: string;
  }): Observable<boolean> {
    const body = {
      employeeCode: onboardData.employeeCode || '',
      departmentId: onboardData.departmentId || '',
      positionId: onboardData.positionId || '',
      managerId: onboardData.managerId,
      joinDate: onboardData.joinDate || new Date().toISOString(),
      dateOfBirth: onboardData.dateOfBirth || ''
    };
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/candidates/${id}/onboard`, body).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to onboard candidate ${id}`, err);
        this.toastService.showError('Onboarding Failed', err?.error?.message || 'Could not onboard candidate.');
        return of(false);
      })
    );
  }

  // =====================================================================
  //  Interview Management
  // =====================================================================

  getInterviews(candidateId?: string): Observable<Interview[]> {
    const params: Record<string, string> = {};
    if (candidateId) params['candidateId'] = candidateId;
    return this.http.get<ApiResponse<Interview[]>>(`${this.apiUrl}/interviews`, { params }).pipe(
      map(res => res.data || []),
      catchError(err => {
        this.logger.error('Failed to fetch interviews', err);
        return of([]);
      })
    );
  }

  createInterview(interview: Partial<Interview>): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/interviews`, interview).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error('Failed to create interview', err);
        this.toastService.showError('Create Failed', err?.error?.message || 'Could not create interview.');
        return of(false);
      })
    );
  }

  updateInterview(id: string, interview: Partial<Interview>): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/interviews/${id}`, interview).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to update interview ${id}`, err);
        this.toastService.showError('Update Failed', err?.error?.message || 'Could not update interview.');
        return of(false);
      })
    );
  }

  deleteInterview(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/interviews/${id}`).pipe(
      map(res => res.succeeded),
      catchError(err => {
        this.logger.error(`Failed to delete interview ${id}`, err);
        this.toastService.showError('Delete Failed', err?.error?.message || 'Could not delete interview.');
        return of(false);
      })
    );
  }
}
