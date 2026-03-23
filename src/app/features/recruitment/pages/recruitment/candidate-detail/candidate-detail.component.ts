import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { DepartmentService } from '@features/organization/services/department.service';
import { PositionService } from '@features/organization/services/position.service';
import { Department } from '@features/organization/services/department.service';
import { Position } from '@features/organization/services/position.service';

interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
  isCurrent: boolean;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  period: string;
}

interface TimelineEvent {
  id: string;
  stage: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
}

interface InterviewNote {
  id: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: string;
}

interface ActivityEvent {
  id: string;
  type: 'upload' | 'link' | 'status' | 'comment' | 'mail' | 'rating';
  title: string;
  date: string;
  icon: string;
  color: string;
  author?: string;
  authorRole?: string;
  content?: string;
  time?: string;
}

interface CandidateDetail {
  id: string;
  name: string;
  fullName: string;
  avatar: string;
  role: string;
  status: string;
  phone: string;
  email: string;
  linkedin: string;
  rating: number;
  gender: string;
  dob: string;
  address: string;
  aiScore?: number;
  aiMatchingSummary?: string;
  extractedSkills?: string;
  experience: Experience[];
  education: Education[];
  timeline: TimelineEvent[];
  notes: InterviewNote[];
  activities: ActivityEvent[];
  documents: { name: string; size: string; type: string; url?: string }[];
  skills: string[];
  tools: string[];
}

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [NgClass, FormsModule, RouterModule, DatePipe],
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidateDetailComponent implements OnInit, OnDestroy {
  candidate: CandidateDetail | null = null;
  loading = false;
  isScoring = false;
  activeTab: 'overview' | 'resume' | 'notes' | 'history' | 'interviews' = 'resume';
  private destroy$ = new Subject<void>();

  // Interviews
  candidateInterviews: any[] = [];
  showScheduleInterviewModal = false;
  isSchedulingInterview = false;
  newInterviewDate = new Date().toISOString().substring(0, 10);
  newInterviewTime = '10:00';
  newInterviewDuration = 60;
  newInterviewLocation = 'Online';
  newInterviewerId = '';

  // Onboarding
  showOnboardModal = false;
  isOnboarding = false;
  departments: Department[] = [];
  positions: Position[] = [];
  filteredPositions: Position[] = [];
  onboardForm = {
    employeeCode: '',
    departmentId: '',
    positionId: '',
    managerId: '',
    joinDate: new Date().toISOString().substring(0, 10),
    dateOfBirth: ''
  };

  constructor(
    private route: ActivatedRoute,
    private logger: LoggerService,
    private toastService: ToastService,
    private recruitmentService: RecruitmentService,
    private departmentService: DepartmentService,
    private positionService: PositionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadCandidate(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCandidate(id: string | null) {
    if (!id) {
      this.logger.warn('CandidateDetailComponent: no id in route');
      return;
    }
    this.loading = true;
    this.recruitmentService.getCandidateById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiCandidate) => {
          if (apiCandidate) {
            // Map the API Candidate model to the UI CandidateDetail shape.
            // Extended fields (experience, education, notes, etc.) are not yet
            // returned by the backend — they display as empty until those
            // endpoints are added.
            this.candidate = {
              id: apiCandidate.id,
              name: apiCandidate.fullName,
              fullName: apiCandidate.fullName,
              avatar: `https://i.pravatar.cc/150?u=${apiCandidate.id}`,
              role: 'N/A',
              status: apiCandidate.status,
              phone: apiCandidate.phone,
              email: apiCandidate.email,
              linkedin: '',
              rating: 0,
              gender: '',
              dob: '',
              address: '',
              experience: [],
              education: [],
              timeline: [
                { id: 't1', stage: 'Applied', date: apiCandidate.appliedDate, status: 'completed' },
                { id: 't2', stage: 'CV Review', date: '', status: apiCandidate.status === 'Screening' ? 'current' : 'pending' },
                { id: 't3', stage: '1st Interview', date: '', status: 'pending' },
                { id: 't4', stage: 'Task Sent', date: '', status: 'pending' },
                { id: 't5', stage: '2nd Interview', date: '', status: 'pending' },
                { id: 't6', stage: 'Offer', date: '', status: 'pending' }
              ],
              notes: [],
              activities: [],
              documents: apiCandidate.resumeUrl
                ? [{ name: 'Resume', size: '', type: 'pdf', url: apiCandidate.resumeUrl }]
                : [],
              skills: apiCandidate.extractedSkills ? apiCandidate.extractedSkills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
              tools: [],
              aiScore: apiCandidate.aiScore,
              aiMatchingSummary: apiCandidate.aiMatchingSummary,
              extractedSkills: apiCandidate.extractedSkills
            };
          } else {
            this.candidate = null;
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load candidate detail', err);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  getRatingStars(score: number): number[] {
    const stars = Math.min(Math.floor(score), 5);
    return Array(5).fill(0).map((_, i) => i < stars ? 1 : 0);
  }

  onTabChange(tab: 'overview' | 'resume' | 'notes' | 'history' | 'interviews') {
    this.activeTab = tab;
    if (tab === 'interviews' && this.candidate) {
      this.loadInterviews(this.candidate.id);
    }
  }

  loadInterviews(candidateId: string) {
    this.recruitmentService.getInterviews(candidateId).pipe(takeUntil(this.destroy$)).subscribe(interviews => {
      this.candidateInterviews = interviews;
      this.cdr.markForCheck();
    });
  }

  openScheduleInterview() {
    this.showScheduleInterviewModal = true;
    this.isSchedulingInterview = false;
    this.newInterviewDate = new Date().toISOString().substring(0, 10);
    this.newInterviewTime = '10:00';
    this.newInterviewDuration = 60;
    this.newInterviewLocation = 'Online';
    this.newInterviewerId = '';
  }

  closeScheduleInterviewModal() {
    this.showScheduleInterviewModal = false;
  }

  submitScheduleInterview() {
    if (!this.candidate || !this.newInterviewerId || !this.newInterviewDate || !this.newInterviewTime) {
      this.toastService.showWarn('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    this.isSchedulingInterview = true;
    const scheduledTime = new Date(`${this.newInterviewDate}T${this.newInterviewTime}`).toISOString();
    this.recruitmentService.createInterview({
      candidateId: this.candidate.id,
      interviewerId: this.newInterviewerId,
      scheduledTime,
      durationMinutes: this.newInterviewDuration,
      location: this.newInterviewLocation,
      status: 'Scheduled'
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ok) => {
        this.isSchedulingInterview = false;
        if (ok) {
          this.toastService.showSuccess('Scheduled', 'Interview has been scheduled.');
          this.closeScheduleInterviewModal();
          this.loadInterviews(this.candidate!.id);
        } else {
          this.toastService.showError('Failed', 'Could not schedule interview.');
        }
      },
      error: () => {
        this.isSchedulingInterview = false;
        this.toastService.showError('Failed', 'Could not schedule interview.');
      }
    });
  }

  deleteInterview(interviewId: string) {
    if (!confirm('Delete this interview?')) return;
    this.recruitmentService.deleteInterview(interviewId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ok) => {
        if (ok) {
          this.toastService.showSuccess('Deleted', 'Interview deleted.');
          if (this.candidate) this.loadInterviews(this.candidate.id);
        } else {
          this.toastService.showError('Failed', 'Could not delete interview.');
        }
      },
      error: () => this.toastService.showError('Failed', 'Could not delete interview.')
    });
  }

  reject() {
    if (!this.candidate) return;
    this.recruitmentService.updateCandidateStatus(this.candidate.id, 'Rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ok) => {
          if (ok) {
            this.toastService.showSuccess('Candidate Rejected', `${this.candidate?.name || 'Candidate'} has been marked as Rejected.`);
            if (this.candidate) this.candidate.status = 'Rejected';
            this.cdr.markForCheck();
          } else {
            this.toastService.showError('Update Failed', 'Could not update candidate status. Please try again.');
          }
        },
        error: () => this.toastService.showError('Update Failed', 'Could not update candidate status. Please try again.')
      });
  }

  email() {
    if (this.candidate?.email) {
      window.location.href = `mailto:${this.candidate.email}`;
    } else {
      this.toastService.showWarn('No Email', 'This candidate does not have an email address on record.');
    }
  }

  moveToNextStage() {
    if (!this.candidate) return;
    const current = this.candidate.status;
    const nextStageMap: { [key: string]: string } = {
      'New': 'Screening',
      'Screening': 'Interview',
      'Interview': 'Technical Test',
      'Technical Test': 'Offer',
      'Offer': 'Hired'
    };
    const next = nextStageMap[current];
    if (!next) {
      this.toastService.showInfo('No Next Stage', 'This candidate is already at the final stage.');
      return;
    }
    this.recruitmentService.updateCandidateStatus(this.candidate.id, next)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ok) => {
          if (ok) {
            this.toastService.showSuccess('Stage Updated', `${this.candidate!.name} moved to ${next}`);
            this.candidate!.status = next;
            this.cdr.markForCheck();
          } else {
            this.toastService.showError('Update Failed', 'Could not update candidate stage.');
          }
        },
        error: () => this.toastService.showError('Update Failed', 'Could not update candidate stage.')
      });
  }

  openOnboardModal() {
    this.showOnboardModal = true;
    this.isOnboarding = false;
    this.departmentService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe(depts => {
      this.departments = depts;
      this.cdr.markForCheck();
    });
    this.positionService.getPositions().pipe(takeUntil(this.destroy$)).subscribe(poss => {
      this.positions = poss;
      this.filterPositions();
      this.cdr.markForCheck();
    });
  }

  closeOnboardModal() {
    this.showOnboardModal = false;
    this.isOnboarding = false;
    this.onboardForm = {
      employeeCode: '',
      departmentId: '',
      positionId: '',
      managerId: '',
      joinDate: new Date().toISOString().substring(0, 10),
      dateOfBirth: ''
    };
  }

  filterPositions() {
    if (this.onboardForm.departmentId) {
      this.filteredPositions = this.positions.filter(p => !p.departmentId || p.departmentId === this.onboardForm.departmentId);
    } else {
      this.filteredPositions = this.positions;
    }
    if (this.onboardForm.positionId && !this.filteredPositions.find(p => p.id === this.onboardForm.positionId)) {
      this.onboardForm.positionId = '';
    }
  }

  submitOnboard() {
    if (!this.candidate) return;
    if (!this.onboardForm.employeeCode || !this.onboardForm.departmentId || !this.onboardForm.positionId || !this.onboardForm.joinDate || !this.onboardForm.dateOfBirth) {
      this.toastService.showWarn('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    this.isOnboarding = true;
    const body: any = {
      employeeCode: this.onboardForm.employeeCode,
      departmentId: this.onboardForm.departmentId,
      positionId: this.onboardForm.positionId,
      managerId: this.onboardForm.managerId || undefined,
      joinDate: new Date(this.onboardForm.joinDate).toISOString(),
      dateOfBirth: new Date(this.onboardForm.dateOfBirth).toISOString()
    };
    this.recruitmentService.onboardCandidate(this.candidate.id, body).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (ok) => {
        this.isOnboarding = false;
        if (ok) {
          this.toastService.showSuccess('Onboarding Complete', `${this.candidate!.name} has been successfully onboarded.`);
          this.closeOnboardModal();
          this.loadCandidate(this.candidate!.id);
        } else {
          this.toastService.showError('Onboarding Failed', 'Could not onboard the candidate.');
        }
      },
      error: (err: Error) => {
        this.isOnboarding = false;
        this.toastService.showError('Onboarding Failed', err.message || 'An error occurred.');
        this.cdr.markForCheck();
      }
    });
  }

  scoreWithAi() {
    if (!this.candidate) return;
    this.isScoring = true;
    this.recruitmentService.scoreCandidate(this.candidate.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isScoring = false;
          this.toastService.showSuccess('AI Success', 'Candidate has been scored successfully.');
          this.loadCandidate(this.candidate!.id); // reload data
        },
        error: (err: Error) => {
          this.isScoring = false;
          this.toastService.showError('AI Scoring Failed', err.message || 'An error occurred while scoring the candidate.');
        }
      });
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackBySkill(index: number, skill: string): string { return skill; }
  trackByTool(index: number, tool: string): string { return tool; }
}
