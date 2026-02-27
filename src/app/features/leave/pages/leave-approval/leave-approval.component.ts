import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveRequestService, LeaveRequest } from '@features/leave/services/leave-request.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { Department } from '@features/organization/models/department.model';
import { LeaveType } from '@features/leave/models/leave-type.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule],
  templateUrl: './leave-approval.component.html',
  styleUrl: './leave-approval.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveApprovalComponent implements OnInit, OnDestroy {
  // State
  activeFilter: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
  requests: LeaveRequest[] = [];
  loading = false;
  processingId: string | null = null;
  private destroy$ = new Subject<void>();

  // Modal State
  showRejectModal = false;
  rejectionReason = '';
  selectedRequest: LeaveRequest | null = null;

  // Filters
  searchTerm = '';
  selectedDepartment = 'All Departments';
  selectedLeaveType = 'Leave Type';
  dateRange = '';

  // Lookups
  departments: string[] = ['All Departments'];
  leaveTypes: string[] = ['Leave Type'];

  constructor(
      private leaveService: LeaveRequestService,
      private toastService: ToastService,
      private logger: LoggerService,
      private masterData: MasterDataService,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadRequests();
    this.loadMasterData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMasterData() {
    this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe((depts: Department[]) => {
      this.departments = ['All Departments', ...depts.map((d: Department) => d.name)];
      this.cdr.markForCheck();
    });
    this.masterData.getLeaveTypes$().pipe(takeUntil(this.destroy$)).subscribe((types: LeaveType[]) => {
      this.leaveTypes = ['Leave Type', ...types.map((t: LeaveType) => t.name)];
      this.cdr.markForCheck();
    });
  }

  loadRequests() {
    this.loading = true;
    this.leaveService.getAllRequests().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data) => {
            this.requests = data;
            this.loading = false;
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.logger.error('Error loading leave requests', err);
            this.toastService.showError('Load Failed', err?.error?.message || 'Could not load leave requests.');
            this.loading = false;
            this.cdr.markForCheck();
        }
    });
  }

  get filteredRequests(): LeaveRequest[] {
      return this.requests.filter(r => {
          const matchStatus = r.status === this.activeFilter;
          const matchSearch = !this.searchTerm || 
                            r.employeeName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            r.employeeCode?.toLowerCase().includes(this.searchTerm.toLowerCase());
          const matchType = this.selectedLeaveType === 'Leave Type' || 
                           r.type === this.selectedLeaveType;
          
          // Department filtering: show all when "All Departments" is selected
          // The leave request model doesn't carry department info, so skip filtering for specific departments
          const matchDept = this.selectedDepartment === 'All Departments' || !this.selectedDepartment;

          return matchStatus && matchSearch && matchType && matchDept;
      });
  }

  get pendingCount(): number {
      return this.requests.filter(r => r.status === 'Pending').length;
  }

  get approvedCount(): number {
      return this.requests.filter(r => r.status === 'Approved').length;
  }

  get rejectedCount(): number {
      return this.requests.filter(r => r.status === 'Rejected').length;
  }

  // Modal Methods
  openRejectModal(req: LeaveRequest) {
    this.selectedRequest = req;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedRequest = null;
  }

  addQuickReason(reason: string) {
    if (this.rejectionReason) {
      this.rejectionReason += ', ' + reason;
    } else {
      this.rejectionReason = reason;
    }
  }

  confirmRejection() {
    if (!this.selectedRequest || !this.rejectionReason.trim()) return;

    this.processingId = this.selectedRequest.id;
    this.leaveService
      .rejectRequest(this.selectedRequest.id, this.rejectionReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.toastService.showSuccess('Success', 'Request rejected successfully');
            this.loadRequests(); // Refresh
          } else {
            this.toastService.showError('Error', 'Failed to reject request');
          }
          this.processingId = null;
          this.closeRejectModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Error rejecting request', err);
          this.toastService.showError('Error', err?.error?.message || 'An error occurred');
          this.processingId = null;
          this.cdr.markForCheck();
        }
      });
  }

  approve(req: LeaveRequest) {
      if (!confirm('Approve this request?')) return;
      
      this.processingId = req.id;
      this.leaveService.approveRequest(req.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (success) => {
              if (success) {
                  this.toastService.showSuccess('Success', 'Request Approved');
                  this.loadRequests();
              } else {
                  this.toastService.showError('Error', 'Approve Failed');
              }
              this.processingId = null;
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.logger.error('Error approving request', err);
              this.toastService.showError('Error', err?.error?.message || 'An error occurred');
              this.processingId = null;
              this.cdr.markForCheck();
          }
      });
  }

  reject(req: LeaveRequest) {
      this.openRejectModal(req);
  }

  getTypeClass(type: string): string {
      const t = type.toLowerCase();
      if (t.includes('vacation')) return 'bg-blue-100 text-blue-800';
      if (t.includes('sick')) return 'bg-amber-100 text-amber-800';
      if (t.includes('emergency')) return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';
  }

  downloadReport() {
    this.toastService.showInfo('Coming Soon', 'Report export feature is coming soon.');
  }

  trackByValue(index: number, value: string): string { return value; }
  trackByRequestId(index: number, req: LeaveRequest): string { return req.id; }
}
