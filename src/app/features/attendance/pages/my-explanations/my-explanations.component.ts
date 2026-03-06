import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ExplanationService,
  AttendanceExplanation,
} from '@features/attendance/services/explanation.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

type StatusFilter = '' | 'Pending' | 'Approved' | 'Rejected';

@Component({
  selector: 'app-my-explanations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-explanations.component.html',
  styleUrl: './my-explanations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyExplanationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  allExplanations: AttendanceExplanation[] = [];

  /** Selected month as "MM-YYYY" */
  selectedMonth: string;

  /** Display range e.g. "01/03/26 – 31/03/26" */
  displayRange = '';

  /** Status filter */
  selectedStatus: StatusFilter = '';
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  /** Month stats */
  stats = { total: 0, pending: 0, approved: 0, rejected: 0 };

  /** Detail drawer */
  selectedItem: AttendanceExplanation | null = null;

  constructor(
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
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.explanationService
      .getMyExplanations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allExplanations = data ?? [];
          this.computeStats();
          this.buildDisplayRange();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('MyExplanations: load failed', err);
          this.toast.showError('Error', err?.error?.message || 'Failed to load explanations');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Month navigation ─────────────────────────────────────────────────────

  prevMonth(): void {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm - 2, 1);
    this.selectedMonth = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    this.computeStats();
    this.buildDisplayRange();
    this.cdr.markForCheck();
  }

  nextMonth(): void {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm, 1);
    this.selectedMonth = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    this.computeStats();
    this.buildDisplayRange();
    this.cdr.markForCheck();
  }

  get isCurrentMonth(): boolean {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return this.selectedMonth === `${mm}-${now.getFullYear()}`;
  }

  monthLabel(): string {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  private computeStats(): void {
    const month = this.currentMonthItems();
    this.stats = {
      total: month.length,
      pending: month.filter(e => e.status === 'Pending').length,
      approved: month.filter(e => e.status === 'Approved').length,
      rejected: month.filter(e => e.status === 'Rejected').length,
    };
  }

  private buildDisplayRange(): void {
    const [mm, yyyy] = this.selectedMonth.split('-').map(Number);
    const first = new Date(yyyy, mm - 1, 1);
    const last = new Date(yyyy, mm, 0);
    this.displayRange = `${this.fmt(first)} – ${this.fmt(last)}`;
  }

  private currentMonthItems(): AttendanceExplanation[] {
    const [mmStr, yyyyStr] = this.selectedMonth.split('-');
    return this.allExplanations.filter(e => {
      const d = new Date(e.workDate);
      return (
        String(d.getMonth() + 1).padStart(2, '0') === mmStr &&
        String(d.getFullYear()) === yyyyStr
      );
    });
  }

  // ── Filtered rows ────────────────────────────────────────────────────────

  get filteredItems(): AttendanceExplanation[] {
    const month = this.currentMonthItems();
    if (!this.selectedStatus) return month;
    return month.filter(e => e.status === this.selectedStatus);
  }

  // ── Detail drawer ────────────────────────────────────────────────────────

  openDetail(item: AttendanceExplanation): void {
    this.selectedItem = item;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selectedItem = null;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closeDetail();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      default:
        return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Approved': return 'check_circle';
      case 'Pending':  return 'schedule';
      case 'Rejected': return 'cancel';
      default:         return 'help';
    }
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }

  formatDateTime(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '—';
    }
  }

  private fmt(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
  }

  trackById(_: number, item: AttendanceExplanation): string {
    return item.id;
  }
}
