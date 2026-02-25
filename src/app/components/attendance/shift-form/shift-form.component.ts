import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ShiftService } from '@features/attendance/services/shift.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormInputComponent],
  templateUrl: './shift-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftFormComponent implements OnInit, OnDestroy {
  shiftForm: FormGroup;
  isEditMode = false;
  shiftId: string | null = null;
  loading = false;
  submitting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    this.shiftForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakStartTime: [''],
      breakEndTime: [''],
      gracePeriodMinutes: [15, [Validators.required, Validators.min(0)]],
      isOvernight: [false],
      description: [''],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.shiftId = this.route.snapshot.paramMap.get('id');
    if (this.shiftId) {
      this.isEditMode = true;
      this.loadShift(this.shiftId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShift(id: string) {
    this.loading = true;
    this.shiftService.getShiftById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (shift) => {
        // Prepare times for input[type="time"] (HH:mm)
        // Backend might send full TimeSpan string "08:00:00", we need "08:00"
        
        const formatTime = (timeStr?: string) => timeStr ? timeStr.substring(0, 5) : '';

        this.shiftForm.patchValue({
          name: shift.name,
          code: shift.code,
          startTime: formatTime(shift.startTime),
          endTime: formatTime(shift.endTime),
          breakStartTime: formatTime(shift.breakStartTime),
          breakEndTime: formatTime(shift.breakEndTime),
          gracePeriodMinutes: shift.gracePeriodMinutes,
          isOvernight: shift.isOvernight,
          isActive: shift.isActive
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading shift', err);
        this.toastService.showError('Error', 'Failed to load shift details');
        this.router.navigate(['/attendance/shifts']);
      }
    });
  }

  onSubmit() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.shiftForm.value;

    // specific formatting for TimeSpan: HH:mm -> HH:mm:ss
    const formatTimeForBackend = (timeStr?: string) => {
      if (!timeStr) return null;
      if (timeStr.length === 5) return `${timeStr}:00`;
      return timeStr;
    };

    const payload = {
      ...formValue,
      startTime: formatTimeForBackend(formValue.startTime),
      endTime: formatTimeForBackend(formValue.endTime),
      breakStartTime: formatTimeForBackend(formValue.breakStartTime),
      breakEndTime: formatTimeForBackend(formValue.breakEndTime)
    };

    if (this.isEditMode && this.shiftId) {
      const updatePayload = { 
        ...payload, 
        id: this.shiftId 
      };
      
      this.shiftService.updateShift(this.shiftId, updatePayload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Success', 'Shift updated successfully');
          this.router.navigate(['/attendance/shifts']);
        },
        error: (err) => {
          this.logger.error('Error updating shift', err);
          this.toastService.showError('Error', err.error?.message || 'Failed to update shift');
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.shiftService.createShift(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Success', 'Shift created successfully');
          this.router.navigate(['/attendance/shifts']);
        },
        error: (err) => {
          this.logger.error('Error creating shift', err);
          this.toastService.showError('Error', err.error?.message || 'Failed to create shift');
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  get showBreakTimes(): boolean {
     // Optional logic to hide break times if not needed, currently always showing
     return true;
  }
}
