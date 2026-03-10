import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { ContractService, Contract } from '@features/employee/services/contract.service';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { LeaveAllocationService } from '@features/leave/services/leave-allocation.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { ConfirmDialogService } from '@core/services/confirm-dialog.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { UploadService } from '@features/employee/services/upload.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EmployeePersonalInfoComponent } from './components/employee-personal-info/employee-personal-info';
import { EmployeeContractsComponent } from './components/employee-contracts/employee-contracts';
import { EmployeeDocumentsComponent } from './components/employee-documents/employee-documents';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    NgClass,
    DatePipe,
    EmployeePersonalInfoComponent,
    EmployeeContractsComponent,
    EmployeeDocumentsComponent
  ],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  @Input() employeeIdInput: string | null = null;
  @Input() isDrawerMode = false;

  activeTab: 'personal' | 'contracts' | 'documents' = 'contracts';

  employeeId: string = '';
  employee: Employee | null = null;
  contracts: Contract[] = [];
  private destroy$ = new Subject<void>();

  loading = false;
  loadingContracts = false;
  initializingLeave = false;

  // Master Data Maps
  departmentsMap: { [key: string]: string } = {};
  positionsMap: { [key: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private empService: EmployeeService,
    private contractService: ContractService,
    private leaveAllocationService: LeaveAllocationService,
    private masterData: MasterDataService,
    private toastService: ToastService,
    private logger: LoggerService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
    private confirmService: ConfirmDialogService
  ) { }

  ngOnInit() {
    this.loadMasterData();

    if (this.employeeIdInput) {
      this.employeeId = this.employeeIdInput;
      this.loadData();
    } else {
      this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params: ParamMap) => {
        const id = params.get('id');
        if (id) {
          this.employeeId = id;
          this.loadData();
        } else {
          if (!this.isDrawerMode) this.router.navigate(['/employees']);
        }
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMasterData() {
    this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Department[]) => {
        data.forEach((d: Department) => {
          if (d.id) this.departmentsMap[d.id] = d.name;
        });
        this.cdr.markForCheck();
      },
      error: (err: unknown) => this.logger.error('Error loading departments', err)
    });

    this.masterData.getPositions$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Position[]) => {
        data.forEach((p: Position) => {
          if (p.id) this.positionsMap[p.id] = p.title;
        });
        this.cdr.markForCheck();
      },
      error: (err: unknown) => this.logger.error('Error loading positions', err)
    });
  }

  getDepartmentName(emp: Employee | null): string {
    if (!emp) return '-';
    const id = emp.jobDetails?.departmentId;
    if (!id) return '-';
    return this.departmentsMap[id] || '-';
  }

  getPositionTitle(emp: Employee | null): string {
    if (!emp) return '-';
    const id = emp.jobDetails?.positionId;
    if (!id) return '-';
    return this.positionsMap[id] || '-';
  }

  getStatus(emp: Employee | null): string {
    if (!emp) return 'Unknown';
    return emp.jobDetails?.status || 'Unknown';
  }

  loadData() {
    this.loading = true;
    this.empService.getEmployeeById(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (emp: Employee) => {
        this.employee = emp;
        this.loading = false;
        this.loadContracts();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.logger.error('Employee not found', err);
        this.toastService.showError('Load Error', err?.error?.message || 'Employee not found');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadContracts() {
    this.loadingContracts = true;
    this.contractService.getContractsByEmployee(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Contract[]) => {
        this.contracts = data.sort((a: Contract, b: Contract) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        this.loadingContracts = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.logger.error('Error loading contracts', err);
        this.toastService.showError('Load Error', 'Could not load contracts');
        this.loadingContracts = false;
        this.cdr.markForCheck();
      }
    });
  }

  initializeLeave() {
    if (!this.employeeId) return;
    const currentYear = new Date().getFullYear();
    this.confirmService.confirm({
      title: 'Initialize Leave',
      message: `Initialize leave allocation for <strong>${currentYear}</strong>? This will set up the annual leave balance for this employee.`,
      type: 'info',
      confirmLabel: 'Initialize'
    }).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.initializingLeave = true;
      this.leaveAllocationService.initializeAllocation(this.employeeId, currentYear).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Initialized', 'Leave allocation initialized successfully');
          this.initializingLeave = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.logger.error('Leave initialization failed', err);
          this.toastService.showError('Error', 'Failed to initialize leave');
          this.initializingLeave = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  getAvatarUrl(): string {
    const url = this.uploadService.getFileUrl(this.employee?.avatarUrl);
    return url || 'assets/images/defaults/avatar-1.png';
  }
}
