import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceService } from '@features/performance/services/performance.service';
import { PerformanceReview, PerformanceGoal, PerformanceGoalStatus, PerformanceReviewStatus } from '@features/performance/models/performance.model';
import { AuthService } from '@core/services/auth.service';
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
  goals: PerformanceGoal[] = [];
  reviews: PerformanceReview[] = [];
  activeTab: 'goals' | 'reviews' = 'goals';
  isLoading = true;
  currentUserId: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.currentUserId = user.id;
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Using simple subscription for now, but ensured isLoading is set correctly
    this.performanceService.getEmployeeGoals(this.currentUserId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (goals) => {
        this.goals = goals;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    this.performanceService.getEmployeeReviews(this.currentUserId).pipe(takeUntil(this.destroy$)).subscribe(reviews => {
      this.reviews = reviews;
      this.cdr.markForCheck();
    });
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

  getStatusClass(status: number): string {
     // Legacy method kept for safety, but templates should use getStatusStyles
     if (status === 1 || status === 2) return 'bg-emerald-100 text-emerald-700';
     if (status === 3) return 'bg-blue-100 text-blue-700';
     if (status === 4) return 'bg-rose-100 text-rose-700';
     return 'bg-slate-100 text-slate-700';
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByGoalId(index: number, goal: PerformanceGoal): string { return goal.id; }
  trackByReviewId(index: number, review: PerformanceReview): string { return review.id; }
}
