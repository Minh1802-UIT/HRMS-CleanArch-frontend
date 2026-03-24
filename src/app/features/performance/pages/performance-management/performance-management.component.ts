import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PerformanceService } from '../../services/performance.service';
import { PerformanceReview, PerformanceGoal, PerformanceGoalStatus, PerformanceReviewStatus } from '../../models/performance.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/models/employee.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-performance-management',
  standalone: true,
  imports: [NgClass, DatePipe, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './performance-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceManagementComponent implements OnInit, OnDestroy {
  // Summary stats
  totalEmployees = 0;
  totalGoals = 0;
  activeGoals = 0;
  overdueGoals = 0;
  totalReviews = 0;
  avgScore = 0;

  // Tab navigation
  activeTab: 'overview' | 'goals' | 'reviews' = 'overview';
  isLoading = true;

  // Goals
  allGoals: PerformanceGoal[] = [];
  goalsPage = 1;
  goalsPageSize = 10;
  filteredGoals: PerformanceGoal[] = [];
  goalSearchTerm = '';
  goalStatusFilter: number | 'all' = 'all';

  // Reviews
  allReviews: PerformanceReview[] = [];
  reviewsPage = 1;
  reviewsPageSize = 10;
  filteredReviews: PerformanceReview[] = [];
  reviewSearchTerm = '';

  // Employee Selector
  selectedEmployee: Employee | null = null;
  employeeSearchResults: Employee[] = [];
  employeeSearchTerm = '';
  showEmployeeDropdown = false;
  isSearchingEmployee = false;
  private employeeSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // New Review Modal
  isReviewModalOpen = false;
  isSubmittingReview = false;
  newReview: Partial<PerformanceReview> = {};
  reviewYears: number[] = [];
  reviewMonths = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  currentYear = new Date().getFullYear();

  // Review Detail Modal
  isReviewDetailOpen = false;
  selectedReview: PerformanceReview | null = null;

  // Goal Detail Modal
  isGoalDetailOpen = false;
  selectedGoal: PerformanceGoal | null = null;
  editingProgress = false;
  progressInput = 0;
  savingProgress = false;

  private destroy$ = new Subject<void>();

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private toastService: ToastService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {
    this.reviewYears = Array.from({ length: 5 }, (_, i) => this.currentYear - i);
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    // Load employees count
    this.employeeService.getEmployees({ pageSize: 1, pageNumber: 1 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.totalEmployees = result.totalCount;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });

    // Load goals for all employees
    this.performanceService.getAllGoals().pipe(takeUntil(this.destroy$)).subscribe({
      next: (goals) => {
        this.allGoals = goals;
        this.totalGoals = goals.length;
        this.activeGoals = goals.filter(g => g.status === PerformanceGoalStatus.InProgress).length;
        this.overdueGoals = goals.filter(g => g.status === PerformanceGoalStatus.Overdue).length;
        this.applyGoalFilters();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    // Load reviews for all employees
    this.performanceService.getAllReviews().pipe(takeUntil(this.destroy$)).subscribe({
      next: (reviews) => {
        this.allReviews = reviews;
        this.totalReviews = reviews.length;
        const completed = reviews.filter(r =>
          r.status === PerformanceReviewStatus.Completed || r.status === PerformanceReviewStatus.Acknowledged
        );
        this.avgScore = completed.length > 0
          ? Math.round(completed.reduce((sum, r) => sum + r.overallScore, 0) / completed.length)
          : 0;
        this.applyReviewFilters();
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  // ===== Goal Filtering =====

  applyGoalFilters(): void {
    let goals = this.allGoals;
    if (this.goalStatusFilter !== 'all') {
      goals = goals.filter(g => g.status === this.goalStatusFilter);
    }
    if (this.goalSearchTerm.trim()) {
      const term = this.goalSearchTerm.toLowerCase();
      goals = goals.filter(g => g.title.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term));
    }
    const start = (this.goalsPage - 1) * this.goalsPageSize;
    this.filteredGoals = goals.slice(start, start + this.goalsPageSize);
  }

  onGoalSearchChange(): void {
    this.goalsPage = 1;
    this.applyGoalFilters();
    this.cdr.markForCheck();
  }

  onGoalStatusFilterChange(): void {
    this.goalsPage = 1;
    this.applyGoalFilters();
    this.cdr.markForCheck();
  }

  get goalTotalPages(): number {
    let goals = this.allGoals;
    if (this.goalStatusFilter !== 'all') goals = goals.filter(g => g.status === this.goalStatusFilter);
    if (this.goalSearchTerm.trim()) {
      const term = this.goalSearchTerm.toLowerCase();
      goals = goals.filter(g => g.title.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term));
    }
    return Math.ceil(goals.length / this.goalsPageSize);
  }

  // ===== Review Filtering =====

  applyReviewFilters(): void {
    let reviews = this.allReviews;
    if (this.reviewSearchTerm.trim()) {
      const term = this.reviewSearchTerm.toLowerCase();
      reviews = reviews.filter(r =>
        r.employeeName?.toLowerCase().includes(term) ||
        r.reviewerName?.toLowerCase().includes(term)
      );
    }
    const start = (this.reviewsPage - 1) * this.reviewsPageSize;
    this.filteredReviews = reviews.slice(start, start + this.reviewsPageSize);
  }

  onReviewSearchChange(): void {
    this.reviewsPage = 1;
    this.applyReviewFilters();
    this.cdr.markForCheck();
  }

  get reviewTotalPages(): number {
    let reviews = this.allReviews;
    if (this.reviewSearchTerm.trim()) {
      const term = this.reviewSearchTerm.toLowerCase();
      reviews = reviews.filter(r =>
        r.employeeName?.toLowerCase().includes(term) ||
        r.reviewerName?.toLowerCase().includes(term)
      );
    }
    return Math.ceil(reviews.length / this.reviewsPageSize);
  }

  // ===== Employee Search (for New Review) =====

  onEmployeeSearch(term: string): void {
    this.employeeSearchTerm = term;
    if (this.employeeSearchTimeout) clearTimeout(this.employeeSearchTimeout);

    if (!term.trim()) {
      this.employeeSearchResults = [];
      this.showEmployeeDropdown = false;
      return;
    }

    this.employeeSearchTimeout = setTimeout(() => {
      this.isSearchingEmployee = true;
      this.employeeService.getEmployees({ pageSize: 10, pageNumber: 1, searchTerm: term }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: result => {
          this.employeeSearchResults = (result.items || []).filter(e => e.status !== 'Terminated' && e.status !== 'Resigned');
          this.isSearchingEmployee = false;
          this.showEmployeeDropdown = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSearchingEmployee = false;
          this.cdr.markForCheck();
        }
      });
    }, 300);
  }

  selectEmployeeForReview(employee: Employee): void {
    this.newReview.employeeId = employee.id;
    this.employeeSearchTerm = employee.fullName;
    this.showEmployeeDropdown = false;
    this.employeeSearchResults = [];
    this.cdr.markForCheck();
  }

  closeEmployeeDropdown(): void {
    setTimeout(() => { this.showEmployeeDropdown = false; this.cdr.markForCheck(); }, 200);
  }

  // ===== Review Modal =====

  openReviewModal(): void {
    const user = this.authService.user();
    this.newReview = {
      employeeId: this.selectedEmployee?.id || '',
      reviewerId: user?.id || '',
      periodStart: `${this.currentYear}-01-01`,
      periodEnd: `${this.currentYear}-12-31`,
      overallScore: 0,
      notes: '',
      status: PerformanceReviewStatus.Draft
    };
    if (this.selectedEmployee) {
      this.employeeSearchTerm = this.selectedEmployee.fullName;
      this.newReview.employeeId = this.selectedEmployee.id;
    }
    this.isReviewModalOpen = true;
    this.cdr.markForCheck();
  }

  closeReviewModal(): void {
    this.isReviewModalOpen = false;
    this.newReview = {};
    this.employeeSearchTerm = '';
    this.cdr.markForCheck();
  }

  submitReview(): void {
    if (!this.newReview.employeeId || !this.newReview.reviewerId) {
      this.toastService.showWarn('Validation', 'Please select an employee.');
      return;
    }
    this.isSubmittingReview = true;
    this.cdr.markForCheck();

    this.performanceService.createReview(this.newReview).pipe(takeUntil(this.destroy$)).subscribe({
      next: (id) => {
        this.isSubmittingReview = false;
        if (id) {
          this.toastService.showSuccess('Review Created', 'Performance review has been created.');
          this.closeReviewModal();
          this.loadAllData();
        } else {
          this.toastService.showError('Save Failed', 'Could not create review.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSubmittingReview = false;
        this.toastService.showError('Save Failed', 'Could not create review.');
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Review Detail Modal =====

  viewReviewDetail(review: PerformanceReview): void {
    this.selectedReview = review;
    this.isReviewDetailOpen = true;
    this.cdr.markForCheck();
  }

  closeReviewDetail(): void {
    this.isReviewDetailOpen = false;
    this.selectedReview = null;
    this.cdr.markForCheck();
  }

  // ===== Goal Detail Modal =====

  openGoalDetail(goal: PerformanceGoal): void {
    this.selectedGoal = goal;
    this.progressInput = goal.progress;
    this.editingProgress = false;
    this.isGoalDetailOpen = true;
    this.cdr.markForCheck();
  }

  closeGoalDetail(): void {
    this.isGoalDetailOpen = false;
    this.selectedGoal = null;
    this.editingProgress = false;
    this.cdr.markForCheck();
  }

  startEditProgress(): void {
    this.editingProgress = true;
    this.cdr.markForCheck();
  }

  cancelEditProgress(): void {
    this.editingProgress = false;
    this.progressInput = this.selectedGoal?.progress ?? 0;
    this.cdr.markForCheck();
  }

  saveProgress(): void {
    if (!this.selectedGoal) return;
    if (this.progressInput < 0 || this.progressInput > 100) {
      this.toastService.showWarn('Validation', 'Progress must be between 0 and 100.');
      return;
    }
    this.savingProgress = true;
    this.cdr.markForCheck();

    this.performanceService.updateGoalProgress(this.selectedGoal.id, this.progressInput).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (success) => {
        this.savingProgress = false;
        if (success) {
          this.toastService.showSuccess('Progress Updated', `Goal progress set to ${this.progressInput}%.`);
          this.editingProgress = false;
          this.loadAllData();
          this.closeGoalDetail();
        } else {
          this.toastService.showError('Update Failed', 'Could not update goal progress.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingProgress = false;
        this.toastService.showError('Update Failed', 'Could not update goal progress.');
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Status Helpers =====

  getGoalStatusLabel(status: PerformanceGoalStatus): string {
    switch (status) {
      case PerformanceGoalStatus.InProgress: return 'In Progress';
      case PerformanceGoalStatus.Completed: return 'Completed';
      case PerformanceGoalStatus.Overdue: return 'Overdue';
      case PerformanceGoalStatus.Cancelled: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  getGoalStatusStyle(status: PerformanceGoalStatus): string {
    switch (status) {
      case PerformanceGoalStatus.InProgress: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case PerformanceGoalStatus.Completed: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case PerformanceGoalStatus.Overdue: return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case PerformanceGoalStatus.Cancelled: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getReviewStatusLabel(status: PerformanceReviewStatus): string {
    switch (status) {
      case PerformanceReviewStatus.Draft: return 'Draft';
      case PerformanceReviewStatus.Pending: return 'Pending';
      case PerformanceReviewStatus.Completed: return 'Completed';
      case PerformanceReviewStatus.Acknowledged: return 'Acknowledged';
      default: return 'Unknown';
    }
  }

  getReviewStatusStyle(status: PerformanceReviewStatus): string {
    switch (status) {
      case PerformanceReviewStatus.Draft: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      case PerformanceReviewStatus.Pending: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case PerformanceReviewStatus.Completed: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case PerformanceReviewStatus.Acknowledged: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}
