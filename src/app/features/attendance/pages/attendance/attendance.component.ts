import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService, AttendanceRecord, DailyStats } from '@features/attendance/services/attendance.service';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { PagedResult } from '@core/models/api-response';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceComponent implements OnInit, OnDestroy {
  records: AttendanceRecord[] = [];
  stats: DailyStats = { present: 0, late: 0, absent: 0, onLeave: 0 };
  loading: boolean = false;
  selectedDate: Date = new Date();
  private destroy$ = new Subject<void>();

  // Simulator State
  showSimulator = false;
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  searchTerm = '';
  selectedEmployeeId = '';
  currentTime = new Date();
  clockInterval: ReturnType<typeof setInterval> | null = null;
  simulatorMessage = '';
  simulatorStatus: 'success' | 'error' | '' = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPagesCount: number = 0;

  protected readonly Math = Math;

  constructor(
      private attendanceService: AttendanceService,
      private employeeService: EmployeeService,
      private logger: LoggerService,
      private toast: ToastService,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
  }

  ngOnDestroy() {
      if (this.clockInterval) clearInterval(this.clockInterval);
      this.destroy$.next();
      this.destroy$.complete();
  }

  loadEmployees() {
      this.logger.debug('Loading employees for attendance simulator lookup');
      this.employeeService.getLookup().pipe(takeUntil(this.destroy$)).subscribe({
          next: (employees) => {
              this.logger.debug('Employees loaded for attendance lookup', employees);
              this.employees = employees || [];
              this.filteredEmployees = [...this.employees];
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.logger.error('Failed to load employees for simulator', err);
              this.toast.showError('Load Error', err?.error?.message || 'Failed to load employees');
              this.simulatorMessage = 'Failed to load employees: ' + (err.statusText || 'Unknown Error');
              this.simulatorStatus = 'error';
              this.cdr.markForCheck();
          }
      });
  }

  filterEmployees() {
      if (!this.searchTerm.trim()) {
          this.filteredEmployees = [...this.employees];
      } else {
          const term = this.searchTerm.toLowerCase();
          this.filteredEmployees = this.employees.filter(emp => 
              emp.fullName?.toLowerCase().includes(term) ||
              emp.employeeCode?.toLowerCase().includes(term) ||
              emp.jobDetails?.departmentId?.toLowerCase().includes(term)
          );
      }
  }

  openSimulator() {
      this.showSimulator = true;
      this.simulatorMessage = '';
      this.clockInterval = setInterval(() => {
          this.currentTime = new Date();
      }, 1000);
  }

  closeSimulator() {
      this.showSimulator = false;
      if (this.clockInterval) clearInterval(this.clockInterval);
  }

  simulateCheckIn() {
      if (!this.selectedEmployeeId) return;
      this.simulatorMessage = 'Processing...';
      this.attendanceService.checkIn(this.selectedEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (msg) => {
              this.simulatorMessage = msg;
              this.simulatorStatus = 'success';
              this.toast.showSuccess('Checked In', msg || 'Checked in successfully');
              this.loadData(); // Refresh table
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.simulatorMessage = err;
              this.simulatorStatus = 'error';
              this.toast.showError('Check-in Failed', err?.error?.message || 'Failed to check in');
              this.cdr.markForCheck();
          }
      });
  }

  simulateCheckOut() {
      if (!this.selectedEmployeeId) return;
      this.simulatorMessage = 'Processing...';
      this.attendanceService.checkOut(this.selectedEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (msg) => {
              this.simulatorMessage = msg;
              this.simulatorStatus = 'success';
              this.toast.showSuccess('Checked Out', msg || 'Checked out successfully');
              this.loadData(); // Refresh table
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.simulatorMessage = err;
              this.simulatorStatus = 'error';
              this.toast.showError('Check-out Failed', err?.error?.message || 'Failed to check out');
              this.cdr.markForCheck();
          }
      });
  }

  processLogs() {
      this.loading = true; // Use global loading or a specific flag
      this.attendanceService.processAttendance().pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
              this.toast.showSuccess('Success', 'Attendance processed successfully');
              this.loadData();
          },
          error: (err) => {
              this.logger.error('Failed to process attendance logs', err);
              this.toast.showError('Process Error', err?.error?.message || 'Failed to process logs');
              this.loading = false;
              this.cdr.markForCheck();
          }
      });
  }

  loadData() {
    this.loading = true;
    // Load Stats
    this.attendanceService.getDailyStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.markForCheck();
      },
      error: (err: any) => this.toast.showError('Error', 'Failed to load daily stats')
    });

    // Load Records
    this.attendanceService.getDailyRecords(this.selectedDate, { pageSize: this.pageSize, pageNumber: this.currentPage }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: PagedResult<AttendanceRecord>) => {
        this.records = data.items;
        this.totalItems = data.totalCount;
        this.totalPagesCount = data.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toast.showError('Error', 'Failed to load daily records');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPagesCount) {
      this.currentPage = page;
      this.loadData();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPagesCount, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }


  onDateChange(event: string | Date) {
    this.selectedDate = new Date(event);
    this.loadData();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Late': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'On Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  // Mock data for calendar badges

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByPage(index: number, page: number): number { return page; }
  trackByEmployeeId(index: number, emp: Employee): string { return emp.id; }
}
