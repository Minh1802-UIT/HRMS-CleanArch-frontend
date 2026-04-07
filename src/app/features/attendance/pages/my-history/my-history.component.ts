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
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  MyAttendanceService,
  MonthlyAttendanceReport,
  DailyLogEntry,
} from '@features/attendance/services/my-attendance.service';
import { ExplanationService, AttendanceExplanation } from '@features/attendance/services/explanation.service';
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
  isUnlinkedAccount = false;  // true when backend returns AUTH_UNLINKED_ACCOUNT

  // Currently selected month in "MM-yyyy" format
  selectedMonth: string;

  // Filter by status ('': all)
  selectedStatus = '';
  readonly statusOptions = ['', 'Present', 'Late', 'EarlyLeave', 'Absent', 'Leave', 'Holiday'];

  // Computed stats
  stats = { present: 0, avgHours: 0, missing: 0, explanations: '0/0', totalWorkdays: 0 };

  // Month-range display e.g. "01/03/26 – 31/03/26"
  displayRange = '';

  // ── Explanation modal ──────────────────────────────────────────────────────
  showExplanationModal = false;
  explanationLog: DailyLogEntry | null = null;   // the day being explained
  explanationReason = '';
  explanationType = 0; // 0 = Missing Punch, 1 = Compensatory Time
  requestedCompHours = 0;
  submittingExplanation = false;
  myExplanations: AttendanceExplanation[] = [];

  constructor(
    private myAttendanceService: MyAttendanceService,
    private explanationService: ExplanationService,
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
    this.isUnlinkedAccount = false;
    this.cdr.markForCheck();

    forkJoin({
      report: this.myAttendanceService.getMyMonthlyReport(this.selectedMonth),
      explanations: this.explanationService.getMyExplanations()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ report, explanations }) => {
        this.report = report;
        this.myExplanations = explanations ?? [];
        this.computeStats();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const errorCode: string = err?.error?.errorCode ?? '';
        const isUnlinked = errorCode === 'AUTH_UNLINKED_ACCOUNT';
        this.isUnlinkedAccount = isUnlinked;
        if (!isUnlinked) {
          this.logger.error('MyHistory: load failed', err);
          this.toast.showError('Error', err?.error?.message || 'Failed to load attendance history');
        }
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
      (l) => l.status === 'Present' || l.status === 'Late' || l.status === 'EarlyLeave'
    ).length;
    const missingDays = workdays.filter(
      (l) => !l.checkInTime && l.status !== 'Leave' && l.status !== 'Holiday' && l.status !== 'OnLeave'
    ).length;
    const totalHrs = logs.reduce((sum, l) => sum + (l.workingHours || 0), 0);
    const avgHrs = presentDays > 0 ? totalHrs / presentDays : 0;

    // Wire explanations counter: N approved / M total submitted this month
    const [mmStr] = this.selectedMonth.split('-');
    const monthExplanations = this.myExplanations.filter(e => {
      const d = new Date(e.workDate);
      return String(d.getMonth() + 1).padStart(2, '0') === mmStr;
    });
    const approvedCount = monthExplanations.filter(e => e.status === 'Approved').length;
    const totalCount = monthExplanations.length;

    this.stats = {
      present: presentDays,
      avgHours: Math.round(avgHrs * 10) / 10,
      missing: missingDays,
      explanations: `${approvedCount}/${totalCount}`,
      totalWorkdays: workdays.length,
    };

    // Build display range from first/last day of the month
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const firstDay = new Date(yyyy, mm - 1, 1);
    const lastDay = new Date(yyyy, mm, 0); // last day of month
    this.displayRange = `${this.fmtDate(firstDay)} – ${this.fmtDate(lastDay)}`;
  }

  /**
   * Returns the effective display status for a log entry.
   * New records store base status "Present" with boolean flags (isLate / isEarlyLeave).
   * Legacy records may still store "Late" or "EarlyLeave" directly as base status.
   */
  getDisplayStatus(log: DailyLogEntry): string {
    if (log.status === 'Present') {
      if (log.isLate) return 'Late';
      if (log.isEarlyLeave) return 'EarlyLeave';
    }
    return log.status;
  }

  get filteredLogs(): DailyLogEntry[] {
    const logs = this.report?.logs ?? [];
    if (!this.selectedStatus) return logs;
    return logs.filter((l) => {
      const display = this.getDisplayStatus(l);
      return display === this.selectedStatus ||
        (this.selectedStatus === 'Leave' && (l.status === 'Leave' || l.status === 'OnLeave'));
    });
  }

  onStatusFilterChange(): void {
    // ChangeDetection is OnPush — mark for re-render
    this.cdr.markForCheck();
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
      case 'EarlyLeave':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
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
    const status = this.getDisplayStatus(log);
    if (status === 'Leave' || status === 'OnLeave') return -1;
    if (status === 'Present') return 100;
    if (status === 'Late') return 50;
    if (status === 'EarlyLeave') return 75;
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

  // ── Explanation modal ──────────────────────────────────────────────────────

  /**
   * True when this log row should offer a "Giải trình" button.
   * Covers both cases:
   *  - isMissingPunch  : checked IN but no checkout (ghost-log may or may not have run)
   *  - isMissingCheckIn: checked OUT but no check-in
   *  - raw missing checkout: past day, has checkIn, no checkOut, flag not yet set by batch
   */
  needsMissingPunchExplanation(log: DailyLogEntry): boolean {
    if (log.isWeekend || log.isHoliday) return false;
    if (log.isMissingPunch) return true;
    // Ghost-log hasn't run yet but the employee clearly forgot to check out
    const logDate = new Date(log.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    logDate.setHours(0, 0, 0, 0);
    return !!log.checkInTime && !log.checkOutTime && logDate < today;
  }

  canCompensate(log: DailyLogEntry): boolean {
    if (log.isWeekend || log.isHoliday) return false;
    if (!this.report || this.report.availableCompensatoryHours <= 0) return false;
    // Prevent compensating beyond standard 8 hours or if already sufficient
    return log.workingHours < 8;
  }

  /** Returns the explanation for a given log date, if any */
  getExplanationForLog(log: DailyLogEntry): AttendanceExplanation | undefined {
    return this.myExplanations.find(e => {
      const d = new Date(e.workDate);
      const logD = new Date(log.date);
      return d.toDateString() === logD.toDateString();
    });
  }

  openExplanationModal(log: DailyLogEntry): void {
    this.explanationLog = log;
    this.explanationReason = '';
    this.explanationType = this.needsMissingPunchExplanation(log) ? 0 : 1;
    this.requestedCompHours = 0;
    this.showExplanationModal = true;
    this.cdr.markForCheck();
  }

  closeExplanationModal(): void {
    this.showExplanationModal = false;
    this.explanationLog = null;
    this.explanationReason = '';
    this.explanationType = 0;
    this.requestedCompHours = 0;
    this.cdr.markForCheck();
  }

  submitExplanation(): void {
    if (!this.explanationLog || !this.explanationReason.trim()) return;
    this.submittingExplanation = true;
    this.cdr.markForCheck();

    const workDate = new Date(this.explanationLog.date);

    if (this.explanationType === 1) {
      if (this.requestedCompHours <= 0 || this.requestedCompHours > 2) {
        this.toast.showError('Lỗi', 'Giờ bù phải lớn hơn 0 và không vượt quá 2 giờ.');
        this.submittingExplanation = false;
        return;
      }
    }

    this.explanationService.submit(workDate, this.explanationReason.trim(), this.explanationType, this.requestedCompHours)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.myExplanations = [...this.myExplanations, result];
          this.computeStats();
          this.toast.showSuccess('Đã gửi', 'Đơn giải trình của bạn đã được gửi thành công.');
          this.submittingExplanation = false;
          this.closeExplanationModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Gửi giải trình thất bại. Vui lòng thử lại.';
          this.toast.showError('Lỗi', msg);
          this.submittingExplanation = false;
          this.cdr.markForCheck();
        }
      });
  }
}
