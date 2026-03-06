import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OvertimeScheduleService, OvertimeSchedule } from '@features/attendance/services/overtime-schedule.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/models/employee.model';
import { ToastService } from '@core/services/toast.service';
import { ConfirmDialogService } from '@core/services/confirm-dialog.service';

@Component({
  selector: 'app-overtime-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overtime-schedule.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OvertimeScheduleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private employeeSearch$ = new Subject<string>();

  // ── State ──────────────────────────────────────────────────────────────
  loading = false;
  saving  = false;

  /** Current month being viewed (MM-yyyy) */
  currentMonthKey = this.getMonthKey(new Date());
  /** Filter by employee (optional) */
  filterEmployeeId = '';

  schedules: OvertimeSchedule[] = [];

  // ── Add-entry form ─────────────────────────────────────────────────────
  selectedEmployeeId  = '';
  selectedEmployeeName = '';
  selectedDate        = '';
  newNote             = '';
  employeeQuery       = '';
  employeeSuggestions: Employee[] = [];
  showSuggestions     = false;

  constructor(
    private service: OvertimeScheduleService,
    private employeeService: EmployeeService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();

    // Debounced employee search
    this.employeeSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length >= 1 ? this.employeeService.getLookup(q, 10) : of([])),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.employeeSuggestions = results;
      this.showSuggestions = results.length > 0;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ────────────────────────────────────────────────────────
  prevMonth(): void {
    const [m, y] = this.currentMonthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    this.currentMonthKey = this.getMonthKey(d);
    this.load();
  }

  nextMonth(): void {
    const [m, y] = this.currentMonthKey.split('-').map(Number);
    const d = new Date(y, m, 1);
    this.currentMonthKey = this.getMonthKey(d);
    this.load();
  }

  // ── Load ──────────────────────────────────────────────────────────────
  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.service.getByMonth(
      this.currentMonthKey,
      this.filterEmployeeId || undefined
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.schedules = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Employee autocomplete ─────────────────────────────────────────────
  onEmployeeInput(value: string): void {
    this.employeeQuery = value;
    if (!value) {
      this.selectedEmployeeId   = '';
      this.selectedEmployeeName = '';
      this.showSuggestions = false;
    }
    this.employeeSearch$.next(value);
  }

  selectEmployee(emp: Employee): void {
    this.selectedEmployeeId   = emp.id;
    this.selectedEmployeeName = emp.fullName;
    this.employeeQuery        = `${emp.fullName} (${emp.employeeCode})`;
    this.showSuggestions      = false;
    this.cdr.markForCheck();
  }

  // ── Add single entry ─────────────────────────────────────────────────
  canAdd(): boolean {
    return !!this.selectedEmployeeId && !!this.selectedDate;
  }

  addSchedule(): void {
    if (!this.canAdd()) return;
    this.saving = true;
    this.cdr.markForCheck();

    this.service.create({
      employeeId: this.selectedEmployeeId,
      date: this.selectedDate,
      note: this.newNote || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: entry => {
        this.toast.showSuccess('Đã thêm', `Ngày OT ${this.formatDate(entry.date)} đã được lên lịch.`);
        this.schedules = [...this.schedules, entry].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        this.selectedDate = '';
        this.newNote      = '';
        this.saving       = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Có lỗi xảy ra.';
        this.toast.showError('Lỗi', msg);
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteSchedule(entry: OvertimeSchedule): void {
    this.confirm.confirm({
      title: 'Xoá lịch OT',
      message: `Xoá lịch OT ngày ${this.formatDate(entry.date)} của ${entry.employeeName ?? entry.employeeId}?`,
      confirmLabel: 'Xoá',
      confirmClass: 'bg-red-500 hover:bg-red-600',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.service.delete(entry.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.schedules = this.schedules.filter(s => s.id !== entry.id);
          this.toast.showSuccess('Đã xoá', 'Lịch OT đã được xoá.');
          this.cdr.markForCheck();
        },
        error: () => {
          this.toast.showError('Lỗi', 'Không thể xoá lịch OT.');
        }
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  formatMonthLabel(key: string): string {
    const [m, y] = key.split('-');
    return `${m}/${y}`;
  }

  private getMonthKey(d: Date): string {
    return `${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  }
}
