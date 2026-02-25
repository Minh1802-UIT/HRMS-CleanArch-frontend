import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggerService } from '@core/services/logger.service';
import { RecruitmentService } from '../../../features/recruitment/services/recruitment.service';

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
  imports: [NgClass, RouterModule],
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidateDetailComponent implements OnInit, OnDestroy {
  candidate: CandidateDetail | null = null;
  loading = false;
  activeTab: 'overview' | 'resume' | 'notes' | 'history' = 'resume';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private logger: LoggerService,
    private recruitmentService: RecruitmentService,
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
              skills: [],
              tools: []
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

  onTabChange(tab: 'overview' | 'resume' | 'notes' | 'history') {
    this.activeTab = tab;
  }

  reject() {
    this.logger.debug('Reject candidate');
  }

  email() {
    this.logger.debug('Email candidate');
  }

  moveToNextStage() {
    this.logger.debug('Move to next stage');
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackBySkill(index: number, skill: string): string { return skill; }
  trackByTool(index: number, tool: string): string { return tool; }
}
