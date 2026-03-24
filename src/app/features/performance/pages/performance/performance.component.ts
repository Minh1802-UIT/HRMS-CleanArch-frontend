import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceService } from '@features/performance/services/performance.service';
import { PerformanceReview, PerformanceGoal, PerformanceGoalStatus, PerformanceReviewStatus } from '@features/performance/models/performance.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/models/employee.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule],
  templateUrl: './performance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceComponent implements OnInit, OnDestroy {
  // Expose enums for template access
  readonly PerformanceGoalStatus = PerformanceGoalStatus;
  readonly PerformanceReviewStatus = PerformanceReviewStatus;

  goals: PerformanceGoal[] = [];
  reviews: PerformanceReview[] = [];
  activeTab: 'goals' | 'reviews' = 'goals';
  isLoading = true;
  currentUserId: string = '';
  currentUserName: string = '';
  currentUserRoles: string[] = [];

  // Employee selector (HR/Manager only)
  isManagerOrHR = false;
  selectedEmployee: Employee | null = null;
  employeeSearchResults: Employee[] = [];
  isSearchingEmployee = false;
  employeeSearchTerm = '';
  showEmployeeDropdown = false;
  private employeeSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  private destroy$ = new Subject<void>();

  // New Goal Modal
  isGoalModalOpen = false;
  savingGoal = false;
  newGoalTitle = '';
  newGoalDescription = '';
  newGoalTargetDate = '';

  // Goal Detail Modal
  isGoalDetailModalOpen = false;
  selectedGoal: PerformanceGoal | null = null;
  editingProgress = false;
  progressInput = 0;
  savingProgress = false;

  // Review Detail Modal
  isReviewDetailModalOpen = false;
  selectedReview: PerformanceReview | null = null;

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private toastService: ToastService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.currentUserId = user.id;
      this.currentUserName = user.fullName || user.username || '';
      this.currentUserRoles = user.roles || [];
      this.isManagerOrHR = this.currentUserRoles.some(r => ['Admin', 'HR', 'Manager'].includes(r));
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads performance goals and reviews for the currently selected employee.
   * If an HR/Manager has selected a specific employee, loads that employee's data.
   * Otherwise loads the current user's data.
   */
  loadData(): void {
    const targetEmployeeId = this.selectedEmployee?.id ?? this.currentUserId;

    this.isLoading = true;
    this.performanceService.getEmployeeGoals(targetEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (goals) => {
        this.goals = goals;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.goals = [];
        this.cdr.markForCheck();
      }
    });

    this.performanceService.getEmployeeReviews(targetEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: reviews => {
        this.reviews = reviews;
        this.cdr.markForCheck();
      },
      error: () => {
        this.reviews = [];
        this.cdr.markForCheck();
      }
    });
  }

  // --- Employee Selector (HR/Manager only) ---

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
          this.employeeSearchResults = result.items.filter(e => e.status !== 'Terminated' && e.status !== 'Resigned');
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

  selectEmployee(employee: Employee): void {
    this.selectedEmployee = employee;
    this.employeeSearchTerm = employee.fullName;
    this.showEmployeeDropdown = false;
    this.employeeSearchResults = [];
    this.activeTab = 'goals';
    this.loadData();
    this.cdr.markForCheck();
  }

  clearSelectedEmployee(): void {
    this.selectedEmployee = null;
    this.employeeSearchTerm = '';
    this.showEmployeeDropdown = false;
    this.employeeSearchResults = [];
    this.loadData();
    this.cdr.markForCheck();
  }

  closeEmployeeDropdown(): void {
    setTimeout(() => {
      this.showEmployeeDropdown = false;
      this.cdr.markForCheck();
    }, 200);
  }

  getGoalStatusLabel(status: PerformanceGoalStatus): string {
    switch (status) {
      case PerformanceGoalStatus.InProgress: return 'In Progress';
      case PerformanceGoalStatus.Completed: return 'Completed';
      case PerformanceGoalStatus.Cancelled: return 'Cancelled';
      case PerformanceGoalStatus.Overdue: return 'Overdue';
      default: return 'In Progress';
    }
  }

  getStatusStyles(status: PerformanceGoalStatus): string {
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

  getStatusClass(status: PerformanceReviewStatus): string {
    switch (status) {
      case PerformanceReviewStatus.Draft: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      case PerformanceReviewStatus.Pending: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case PerformanceReviewStatus.Completed: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case PerformanceReviewStatus.Acknowledged: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  }

  exportPdf(): void {
    this.toastService.showInfo('Export PDF', 'PDF export will be available in a future update.');
  }

  openNewGoalModal(): void {
    this.newGoalTitle = '';
    this.newGoalDescription = '';
    this.newGoalTargetDate = '';
    this.isGoalModalOpen = true;
    this.cdr.markForCheck();
  }

  closeGoalModal(): void {
    this.isGoalModalOpen = false;
    this.cdr.markForCheck();
  }

  submitGoal(): void {
    if (!this.newGoalTitle.trim() || !this.newGoalTargetDate) {
      this.toastService.showWarn('Validation', 'Please fill in Goal Title and Target Date.');
      return;
    }
    this.savingGoal = true;
    this.cdr.markForCheck();
    const targetEmployeeId = this.selectedEmployee?.id ?? this.currentUserId;
    const payload: Partial<PerformanceGoal> = {
      employeeId: targetEmployeeId,
      title: this.newGoalTitle.trim(),
      description: this.newGoalDescription.trim(),
      targetDate: this.newGoalTargetDate,
      progress: 0,
      status: PerformanceGoalStatus.InProgress
    };
    this.performanceService.createGoal(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (id) => {
        this.savingGoal = false;
        if (id) {
          const targetName = this.selectedEmployee?.fullName ?? 'your goals';
          this.toastService.showSuccess('Goal Created', `"${payload.title}" has been added to ${targetName}.`);
          this.closeGoalModal();
          this.loadData();
        } else {
          this.toastService.showError('Save Failed', 'Could not create the goal. Please try again.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingGoal = false;
        this.toastService.showError('Save Failed', 'Could not create the goal. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  // --- Goal Detail Modal ---

  openGoalDetail(goal: PerformanceGoal): void {
    this.selectedGoal = goal;
    this.progressInput = goal.progress;
    this.editingProgress = false;
    this.isGoalDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeGoalDetail(): void {
    this.isGoalDetailModalOpen = false;
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
          this.loadData();
          // Update selectedGoal from the freshly loaded goals array
          const updatedGoal = this.goals.find(g => g.id === this.selectedGoal!.id);
          if (updatedGoal) {
            this.selectedGoal = updatedGoal;
          }
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

  // --- Review Detail Modal ---

  viewReviewDetail(review: PerformanceReview): void {
    this.selectedReview = review;
    this.isReviewDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeReviewDetail(): void {
    this.isReviewDetailModalOpen = false;
    this.selectedReview = null;
    this.cdr.markForCheck();
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByGoalId(index: number, goal: PerformanceGoal): string { return goal.id; }
  trackByReviewId(index: number, review: PerformanceReview): string { return review.id; }
}
