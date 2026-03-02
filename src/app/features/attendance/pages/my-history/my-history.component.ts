import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  MyAttendanceService,
  MonthlyAttendanceReport,
  DailyLogEntry,
} from '@features/attendance/services/my-attendance.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-my-history',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, FormsModule],
  templateUrl: './my-history.component.html',
  styleUrl: './my-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  report: MonthlyAttendanceReport | null = null;

  // Currently selected month in "MM-yyyy" format
  selectedMonth: string;

  // Computed stats
  stats = { present: 0, avgHours: 0, missing: 0, explanations: '0/0' };

  // Week-range display for the current page (mirrors screenshot "25/02/26 – 24/03/26")
  displayRange = '';

  constructor(
    private myAttendanceService: MyAttendanceService,
    private toast: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    this.selectedMonth = `${mm}-${now.getFullYear()}`;
  }

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReport(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.myAttendanceService
      .getMyMonthlyReport(this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rpt) => {
          this.report = rpt;
          this.computeStats();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('MyHistory: load failed', err);
          this.toast.showError('Error', err?.error?.message || 'Failed to load attendance history');
          this.report = null;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  computeStats(): void {
    if (!this.report) return;
    const logs = this.report.logs ?? [];
    const workdays = logs.filter((l) => !l.isWeekend && !l.isHoliday);
    const presentDays = workdays.filter(
      (l) => l.status === 'Present' || l.status === 'Late'
    ).length;
    const missingDays = workdays.filter(
      (l) => !l.checkInTime && l.status !== 'Leave' && l.status !== 'Holiday'
    ).length;
    const totalHrs = logs.reduce((sum, l) => sum + (l.workingHours || 0), 0);
    const avgHrs = presentDays > 0 ? totalHrs / presentDays : 0;

    this.stats = {
      present: presentDays,
      avgHours: Math.round(avgHrs * 10) / 10,
      missing: missingDays,
      explanations: '0/0',
    };

    // Build display range
    if (logs.length > 0) {
      const first = new Date(logs[0].date);
      const last = new Date(logs[logs.length - 1].date);
      this.displayRange = `${this.fmtDate(first)} – ${this.fmtDate(last)}`;
    }
  }

  prevMonth(): void {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm - 2, 1);
    this.selectedMonth = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    this.loadReport();
  }

  nextMonth(): void {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm, 1);
    this.selectedMonth = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    this.loadReport();
  }

  monthLabel(): string {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'Late':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
      case 'Absent':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      case 'Leave':
      case 'OnLeave':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      case 'Holiday':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
      default:
        return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  }

  getScoreValue(log: DailyLogEntry): number {
    if (log.isWeekend || log.isHoliday) return -1;
    if (!log.checkInTime) return 0;
    if (log.status === 'Present') return 100;
    if (log.status === 'Late') return 50;
    return 0;
  }

  getScoreClass(log: DailyLogEntry): string {
    const s = this.getScoreValue(log);
    if (s < 0) return '';
    if (s === 100) return 'score-full';
    if (s > 0) return 'score-partial';
    return 'score-zero';
  }

  formatTime(iso: string | null): string {
    if (!iso) return '-/-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-/-';
    }
  }

  private fmtDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
  }

  trackByDate(_: number, log: DailyLogEntry): string {
    return log.date;
  }
}
