import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveRequestService, LeaveRequest } from '@features/leave/services/leave-request.service';
import { ToastService } from '@core/services/toast.service';
import { LeaveType } from '@features/leave/models/leave-type.model';
import { AuthService } from '@core/services/auth.service';
import { LeaveAllocationService } from '@features/leave/services/leave-allocation.service';
import { LeaveAllocationDto } from '@features/leave/models/leave-allocation.model';
import { LoggerService } from '@core/services/logger.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule],
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveRequestComponent implements OnInit, OnDestroy {
  leaveTypes: LeaveType[] = [];
  selectedTypeId: string = '';
  startDate: string = '';
  endDate: string = '';
  reason: string = '';
  
  history: LeaveRequest[] = [];
  loading: boolean = false;
  submitting: boolean = false;
  submitted: boolean = false; // Added for validation trigger
  private destroy$ = new Subject<void>();

  constructor(
      private leaveService: LeaveRequestService,
      private masterData: MasterDataService,
      private toastService: ToastService,
      private authService: AuthService,
      private leaveAllocationService: LeaveAllocationService,
      private logger: LoggerService,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadLeaveTypes();
    this.loadHistory();
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLeaveTypes() {
      this.masterData.getLeaveTypes$().pipe(takeUntil(this.destroy$)).subscribe({
          next: (types: LeaveType[]) => {
              this.leaveTypes = types;
              if (types.length > 0) {
                  this.selectedTypeId = types[0].id;
              }
              // ✅ Load balances for all types
              this.loadBalances();
              this.cdr.markForCheck();
          },
          error: (err: any) => this.logger.error('Failed to load leave types', err)
      });
  }
  balances: { [key: string]: number } = {}; // Map: TypeId -> Balance

  loadBalances() {
      const empId = this.authService.currentUserValue?.employeeId;
      if (!empId) return;

      const currentYear = new Date().getFullYear().toString();
      
      // Fetch ALL allocations for this employee
      this.leaveAllocationService.getAllocationsForEmployee(empId).pipe(takeUntil(this.destroy$)).subscribe({
          next: (allAllocations) => {
              // Filter for CURRENT YEAR only
              const allocations = (allAllocations || []).filter((a: LeaveAllocationDto) => a.year == currentYear);

              // If no allocations found, just show empty balances
              if (allocations.length === 0) {
                  this.balances = {};
                  this.cdr.markForCheck();
                  return;
              }

              // Map allocations to balances
              this.balances = {};
              allocations.forEach((alloc: LeaveAllocationDto) => {
                  const days = alloc.remainingDays ?? 0;
                  this.balances[alloc.leaveTypeId] = days ?? 0;
              });
              this.cdr.markForCheck();
          },
          error: (err) => this.logger.error('Failed to load employee allocations', err)
      });
  }

  loadHistory() {
    this.loading = true;
    this.leaveService.getLeaveHistory().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading leave history', err);
        this.toastService.showError('Load Error', err?.error?.message || 'Could not load leave history.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit() {
    this.submitted = true; // Trigger validation messages

    if (!this.startDate || !this.endDate || !this.reason || !this.selectedTypeId) {
      this.toastService.showWarn('Validation Error', 'Please fill in all required fields (including leave type).');
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (end < start) {
      this.toastService.showWarn('Invalid Date', 'End date cannot be before start date.');
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    this.submitting = true;
    this.leaveService.submitRequest({
      type: this.selectedTypeId,
      startDate: start,
      endDate: end,
      days: diffDays,
      reason: this.reason
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.showSuccess('Submitted', 'Leave request submitted successfully.');
          this.reason = '';
          this.loadHistory();
        }
        this.submitting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error submitting leave request', err);
        // Extract specific message if available
        const msg = err.error?.message || err.error || 'Failed to submit leave request.';
        this.toastService.showError('Submission Failed', msg);
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByLeaveTypeId(index: number, type: LeaveType): string { return type.id; }
  trackByIndex(index: number, item?: unknown): number { return index; }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
