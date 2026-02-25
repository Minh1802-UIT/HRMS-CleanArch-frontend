import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, CurrencyPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { PayrollService, Payroll, PayrollRecord } from '@features/payroll/services/payroll.service';
import { ContractService, Contract } from '@features/employee/services/contract.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { AddEmployeeComponent } from '../add-employee/add-employee.component';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { UploadService } from '@features/employee/services/upload.service';
import { ContractManagementComponent } from './contract-management/contract-management.component';
import { LeaveAllocationService } from '@features/leave/services/leave-allocation.service';
import { LeaveRequestService } from '@features/leave/services/leave-request.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface LeaveBalance {
  type: string;
  days: number;
  icon: string;
}

import { LeaveStatus } from '@features/leave/models/leave-request.model';

interface DisplayLeaveRequest {
  id: string;
  dateFrom: string;
  dateTo: string;
  duration: string;
  leaveType: string;
  status: LeaveStatus;
  hasAttachment: boolean;
}

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    NgClass, CurrencyPipe, SlicePipe,
    FormsModule, 
    RouterModule, 
    AddEmployeeComponent,
    ContractManagementComponent
  ],
  templateUrl: './employee-profile.component.html',
  styleUrl: './employee-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeProfileComponent implements OnInit, OnDestroy {
  employeeId: string = '';
  employee: Employee | null = null;
  contracts: Contract[] = [];
  loading = true;
  activeTab = 'overview';
  showEditModal = false;
  editStep = 1;
  canEdit = false; // Permission flag
  private destroy$ = new Subject<void>();

  // Master Data Maps
  departmentsMap: { [key: string]: string } = {};
  positionsMap: { [key: string]: string } = {};

  // Leave Balances
  leaveBalances: LeaveBalance[] = [];

  // Leave Requests
  leaveRequests: DisplayLeaveRequest[] = [];

  // Real Payroll Data
  latestPayroll: PayrollRecord | null = null; // Changed from hardcoded object

  get totalStatutoryDeductions(): number {
    if (!this.latestPayroll) return 0;
    return (this.latestPayroll.socialInsurance ?? 0)
      + (this.latestPayroll.healthInsurance ?? 0)
      + (this.latestPayroll.unemploymentInsurance ?? 0)
      + (this.latestPayroll.personalIncomeTax ?? 0);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private contractService: ContractService,
    private masterData: MasterDataService,
    private logger: LoggerService,
    private toastService: ToastService,
    private uploadService: UploadService,
    private payrollService: PayrollService,
    private authService: AuthService,
    private leaveAllocationService: LeaveAllocationService,
    private leaveRequestService: LeaveRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.checkPermissions();
    this.loadMasterData();
    
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // /profile route has no :id — fall back to the current user's own employeeId
      this.employeeId = params.get('id') || this.authService.currentUserValue?.employeeId || '';
      if (this.employeeId) {
        this.loadEmployee();
        this.loadContracts();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkPermissions() {
      const user = this.authService.currentUserValue;
      if (user && user.roles) {
          this.canEdit = user.roles.includes('Admin') || user.roles.includes('HR');
      }
  }

  loadMasterData() {
    this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe((departments: Department[]) => {
      departments.forEach(d => {
        if (d.id) this.departmentsMap[d.id] = d.name;
      });
      this.cdr.markForCheck();
    });
    this.masterData.getPositions$().pipe(takeUntil(this.destroy$)).subscribe((positions: Position[]) => {
      positions.forEach(p => {
        if (p.id) this.positionsMap[p.id] = p.title;
      });
      this.cdr.markForCheck();
    });
  }

  loadEmployee() {
    this.loading = true;
    this.employeeService.getEmployeeById(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Employee) => {
        this.employee = data;
        this.loading = false;
        // Load additional employee data
        this.loadPayroll(); 
        this.loadLeaveData();
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.logger.error('Failed to load employee', err);
        this.toastService.showError('Failed to load employee details', err?.message || 'Error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadPayroll() {
      if (!this.employee) return;
      
      const now = new Date();
      const currentMonth = now.toLocaleString('default', { month: 'long' }); // e.g. "February"
      const currentYear = now.getFullYear();

      // Fetch payrolls for current month to see if this employee has one
      this.payrollService.getPayrollData(currentMonth, currentYear).pipe(takeUntil(this.destroy$)).subscribe({
          next: (payrolls) => {
              if (payrolls && this.employee) {
                  this.latestPayroll = payrolls.find(p => p.employeeCode === this.employee?.employeeCode) || null;
              }
              this.cdr.markForCheck();
          },
          error: (err) => this.logger.warn('Could not load payroll data', err)
      });
  }

  loadContracts() {
    this.contractService.getContractsByEmployee(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Contract[]) => {
        this.contracts = data;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.logger.error('Failed to load contracts', err);
        this.toastService.showError('Load Error', 'Could not load contracts');
      }
    });
  }

  loadLeaveData() {
    if (!this.employeeId) return;

    const currentYear = new Date().getFullYear().toString();

    // 1. Load Allocations (Balances)
    this.leaveAllocationService.getAllocationsForEmployee(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (allocs) => {
        // Filter for current year
        const yearAllocs = allocs.filter(a => a.year === currentYear);
        this.leaveBalances = yearAllocs.map(a => ({
          type: a.leaveTypeName,
          days: a.remainingDays,
          icon: this.getLeaveIcon(a.leaveTypeName)
        }));
        this.cdr.markForCheck();
      },
      error: (err) => this.logger.error('Failed to load leave balances', err)
    });

    // 2. Load Leave Requests (All History for this employee)
    // Note: RequestService usually fetches "me", but managers/admins need to see this employee's specifically
    // We'll use the getAllRequests() which might be filtered by the backend if role allows, 
    // or we might need a specific getByEmployee if available.
    // For now, let's filter the list if it returns all.
    this.leaveRequestService.getAllRequests().pipe(takeUntil(this.destroy$)).subscribe({
        next: (requests) => {
            this.leaveRequests = requests
                .filter(r => r.employeeId === this.employeeId)
                .map(r => ({
                    id: r.id,
                    dateFrom: this.formatDate(r.startDate),
                    dateTo: this.formatDate(r.endDate),
                    duration: `${r.days} day${r.days > 1 ? 's' : ''}`,
                    leaveType: r.type,
                    status: r.status,
                    hasAttachment: false
                }));
            this.cdr.markForCheck();
        },
        error: (err) => this.logger.error('Failed to load leave requests', err)
    });
  }

  public getLeaveIcon(typeName: string): string {
    const name = typeName.toLowerCase();
    if (name.includes('annual'))  return 'calendar_month';
    if (name.includes('sick'))    return 'health_and_safety';
    if (name.includes('wedding')) return 'favorite';
    if (name.includes('funeral')) return 'sentiment_sad';
    if (name.includes('maternity')) return 'child_care';
    return 'event_available';
  }

  getDepartmentName(): string {
    if (!this.employee?.jobDetails?.departmentId) return '-';
    return this.departmentsMap[this.employee.jobDetails.departmentId] || '-';
  }

  getPositionTitle(): string {
    if (!this.employee?.jobDetails?.positionId) return '-';
    return this.positionsMap[this.employee.jobDetails.positionId] || '-';
  }


  getEmploymentType(): string {
    return this.employee?.status || 'Full time';
  }

  getStatus(): string {
    return this.employee?.jobDetails?.status || 'Active';
  }

  goBack() {
    this.router.navigate(['/employees']);
  }

  deleteEmployee() {
    if (confirm(`Are you sure you want to delete ${this.employee?.fullName}? This action cannot be undone.`)) {
      this.employeeService.deleteEmployee(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Deleted', 'Employee deleted successfully');
          this.router.navigate(['/employees']);
        },
        error: (err: Error) => {
          this.logger.error('Failed to delete employee', err);
          this.toastService.showError('Delete Failed', 'Could not delete employee');
        }
      });
    }
  }

  openEditModal(step: number = 1) {
    this.editStep = step;
    this.showEditModal = true;
  }

  onEmployeeUpdated() {
    this.showEditModal = false;
    this.loadEmployee();
  }

  getAvatarUrl(path: string | undefined): string {
    return this.uploadService.getFileUrl(path);
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCurrentContract(): Contract | null {
    if (this.contracts.length === 0) return null;
    return this.contracts[0];
  }

  trackByIndex(index: number, item?: unknown): number {
    return index;
  }
}
