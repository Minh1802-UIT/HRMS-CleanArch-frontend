import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggerService } from '@core/services/logger.service';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { JobVacancy, Candidate, RecruitmentStage } from '@features/recruitment/models/recruitment.model';

// interfaces removed, now using external models

@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule, RouterModule],
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecruitmentComponent implements OnInit, OnDestroy {
  activeTab: 'jobs' | 'candidates' | 'process' = 'jobs';
  viewMode: 'list' | 'kanban' = 'list';
  private destroy$ = new Subject<void>();
  
  // Filters
  searchTerm: string = '';
  selectedOffice: string = '';
  selectedDepartment: string = '';
  selectedStatus: string = '';
  selectedEmploymentType: string = '';
  selectedJob: string = '';
  selectedStage: string = '';
  
  // Data
  jobs: JobVacancy[] = [];
  filteredJobs: JobVacancy[] = [];
  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  stages: RecruitmentStage[] = [];
  selectedJobDetail: JobVacancy | null = null;
  kanbanStages = ['Applied', 'CV Review', '1st Interview', 'Task Sent', '2nd Interview'];
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Action menu
  openMenuId: string | null = null;
  openCandidateMenuId: string | null = null;

  constructor(
    private logger: LoggerService,
    private recruitmentService: RecruitmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadJobs();
    this.loadCandidates();
    this.loadStages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobs() {
    this.recruitmentService.getVacancies().pipe(takeUntil(this.destroy$)).subscribe(vacancies => {
      // Mapping backend values to expected UI structure if necessary
      this.jobs = vacancies.map(v => ({
        ...v,
        department: v.department || 'Products',
        office: v.office || 'New York',
        employmentType: v.employmentType || 'Full time',
        totalCandidates: v.totalCandidates ?? 0
      }));
      this.applyFilters();
      if (this.jobs.length > 0) {
        this.loadCandidatesForFirstJob();
      }
      this.cdr.markForCheck();
    });
  }

  loadCandidatesForFirstJob() {
    if (this.jobs.length > 0) {
      this.loadCandidates(this.jobs[0].id);
    }
  }

  loadCandidates(vacancyId?: string) {
    const observable = vacancyId 
      ? this.recruitmentService.getCandidatesByVacancy(vacancyId)
      : of([]); // or fetch all if needed

    observable.pipe(takeUntil(this.destroy$)).subscribe(candidates => {
      this.candidates = candidates.map(c => ({
        ...c,
        name: c.fullName,
        avatar: `https://i.pravatar.cc/150?u=${c.id}`,
        score: c.score,
        jobTitle: this.jobs.find(j => j.id === c.jobVacancyId)?.title || 'Unknown',
        department: this.jobs.find(j => j.id === c.jobVacancyId)?.department || 'Products',
        employmentType: this.jobs.find(j => j.id === c.jobVacancyId)?.employmentType || 'Full time',
        status: (c.status as string) || 'New'
      }));
      this.applyCandidateFilters();
      this.refreshStageCounts();
      this.cdr.markForCheck();
    });
  }

  loadStages() {
    this.stages = [
      { id: 'S1', name: 'CV Review', count: 0, icon: 'description', color: 'bg-blue-500' },
      { id: 'S2', name: 'Interview', count: 0, icon: 'group', color: 'bg-orange-500' },
      { id: 'S3', name: 'Technical Test', count: 0, icon: 'terminal', color: 'bg-purple-500' },
      { id: 'S4', name: 'Offer', count: 0, icon: 'verified', color: 'bg-emerald-500' },
      { id: 'S5', name: 'Hired', count: 0, icon: 'check_circle', color: 'bg-indigo-500' }
    ];
  }

  /** Recompute stage counts from the actual candidates list. */
  refreshStageCounts() {
    const stageStatusMap: Record<string, string> = {
      'CV Review': 'Screening',
      'Interview': 'Interview',
      'Technical Test': 'Technical Test',
      'Offer': 'Offer',
      'Hired': 'Hired'
    };
    this.stages = this.stages.map(stage => ({
      ...stage,
      count: this.candidates.filter(c => c.status === stageStatusMap[stage.name]).length
    }));
  }

  applyFilters() {
    let result = this.jobs;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(j => 
        (j.title?.toLowerCase().includes(term) ?? false) || 
        (j.department?.toLowerCase().includes(term) ?? false)
      );
    }
    if (this.selectedOffice) result = result.filter(j => j.office === this.selectedOffice);
    if (this.selectedDepartment) result = result.filter(j => j.department === this.selectedDepartment);
    if (this.selectedStatus) result = result.filter(j => j.status === this.selectedStatus);
    if (this.selectedEmploymentType) result = result.filter(j => j.employmentType === this.selectedEmploymentType);

    this.filteredJobs = result;
    this.totalItems = result.length;
    this.currentPage = 1;
  }

  applyCandidateFilters() {
    let result = this.candidates;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.name?.toLowerCase().includes(term) ?? false) || 
        (c.jobTitle?.toLowerCase().includes(term) ?? false) || 
        (c.department?.toLowerCase().includes(term) ?? false)
      );
    }
    if (this.selectedJob) result = result.filter(c => c.jobTitle === this.selectedJob);
    if (this.selectedDepartment) result = result.filter(c => c.department === this.selectedDepartment);
    if (this.selectedStatus) result = result.filter(c => c.status === this.selectedStatus);
    if (this.selectedStage) result = result.filter(c => c.status === this.selectedStage);
    if (this.selectedEmploymentType) result = result.filter(c => c.employmentType === this.selectedEmploymentType);

    this.filteredCandidates = result;
    this.totalItems = result.length;
    this.currentPage = 1;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedOffice = '';
    this.selectedDepartment = '';
    this.selectedStatus = '';
    this.selectedEmploymentType = '';
    this.selectedJob = '';
    this.selectedStage = '';
    this.applyFilters();
    this.applyCandidateFilters();
  }

  getCandidatesByStage(stage: string): Candidate[] {
    const statusMap: { [key: string]: string } = {
      'Applied': 'New',
      'CV Review': 'Screening',
      '1st Interview': 'Interview',
      'Task Sent': 'Technical Test',
      '2nd Interview': 'Offer'
    };
    const status = statusMap[stage] || stage;
    return this.candidates.filter(c => 
      c.jobTitle === this.selectedJobDetail?.title && 
      (c.status === status || (stage === 'TASK SENT' && c.status === 'Screening'))
    );
  }

  getRatingStars(score: number): number[] {
    const stars = Math.min(Math.floor(score / 20), 5);
    return Array(5).fill(0).map((_, i) => i < stars ? 1 : 0);
  }

  goBackToJobs() {
    this.viewMode = 'list';
    this.selectedJobDetail = null;
  }

  viewCandidates(job: JobVacancy) {
    this.selectedJobDetail = job;
    this.viewMode = 'kanban';
    this.loadCandidates(job.id);
    this.closeMenu();
  }

  onTabChange(tab: 'jobs' | 'candidates' | 'process') {
    this.activeTab = tab;
    this.clearFilters();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Published':
      case 'Hired': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Pending':
      case 'Screening':
      case 'Interview': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Closed':
      case 'Rejected': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      case 'Draft':
      case 'New': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Offer': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  toggleMenu(jobId: string) {
    this.openMenuId = this.openMenuId === jobId ? null : jobId;
  }

  closeMenu() {
    this.openMenuId = null;
  }

  viewJobDetails(job: JobVacancy) {
    this.logger.debug('View details for:', job.title);
    this.closeMenu();
  }

  openSettings(job: JobVacancy) {
    this.logger.debug('Settings for:', job.title);
    this.closeMenu();
  }

  addNewJob() {
    this.logger.debug('Add new job');
  }

  toggleJobSelection(job: JobVacancy) {
    job.selected = !job.selected;
  }

  get allJobsSelected(): boolean {
    return this.paginatedJobs.length > 0 && this.paginatedJobs.every(j => j.selected);
  }

  toggleAllJobs() {
    const allSelected = this.allJobsSelected;
    this.paginatedJobs.forEach(j => j.selected = !allSelected);
  }

  get paginatedJobs(): JobVacancy[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredJobs.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalItems / this.itemsPerPage), 1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3, 4);
      if (total > 5) pages.push(-1); // ellipsis
      pages.push(total - 1, total);
    }
    return pages;
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  trackByJobId(index: number, job: JobVacancy): string { return job.id; }
  trackByPage(index: number, page: number): number { return page; }
  trackByStage(index: number, stage: string): string { return stage; }
  trackByCandidateId(index: number, candidate: Candidate): string { return candidate.id; }
  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByStageId(index: number, stage: RecruitmentStage): string { return stage.id; }
}
