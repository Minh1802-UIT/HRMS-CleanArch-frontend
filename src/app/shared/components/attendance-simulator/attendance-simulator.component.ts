import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '@features/attendance/services/attendance.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-attendance-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-simulator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceSimulatorComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  selectedEmployeeId = '';
  restrictedEmployeeName = '';
  restrictedAvatar = '';
  
  currentTime = new Date();
  clockInterval: ReturnType<typeof setInterval> | null = null;
  simulatorMessage = '';
  simulatorStatus: 'success' | 'error' | '' = '';
  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
    private logger: LoggerService,
    private authService: AuthService
    , private toast: ToastService
    , private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.identifyUser();
    this.startClock();
  }

  identifyUser() {
    this.logger.debug('Identifying user for attendance simulator');
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.selectedEmployeeId = user.employeeId || '';
        this.restrictedEmployeeName = user.fullName || user.username;
        this.restrictedAvatar = user.avatar || '';
        
        if (!this.selectedEmployeeId) {
            this.simulatorMessage = 'Error: No Employee ID found for your account.';
            this.simulatorStatus = 'error';
        }
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.stopClock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  startClock() {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    }, 1000);
  }

  stopClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  closeModal() {
    this.close.emit();
  }

  // Methods loadEmployees and filterEmployees removed as they are no longer needed for self-service.

  simulateCheckIn() {
    if (!this.selectedEmployeeId) return;
    this.simulatorMessage = 'Processing...';
    this.attendanceService.checkIn(this.selectedEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (msg: string) => {
        this.simulatorMessage = msg;
        this.simulatorStatus = 'success';
        this.toast.showSuccess('Checked In', msg || 'Checked in successfully');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const message = err?.error?.message || err || 'Check-in failed';
        this.simulatorMessage = message;
        this.simulatorStatus = 'error';
        this.toast.showError('Check-in Failed', message);
        this.cdr.markForCheck();
      }
    });
  }

  simulateCheckOut() {
    if (!this.selectedEmployeeId) return;
    this.simulatorMessage = 'Processing...';
    this.attendanceService.checkOut(this.selectedEmployeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (msg: string) => {
        this.simulatorMessage = msg;
        this.simulatorStatus = 'success';
        this.toast.showSuccess('Checked Out', msg || 'Checked out successfully');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const message = err?.error?.message || err || 'Check-out failed';
        this.simulatorMessage = message;
        this.simulatorStatus = 'error';
        this.toast.showError('Check-out Failed', message);
        this.cdr.markForCheck();
      }
    });
  }
}
