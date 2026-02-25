import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { ContractService, Contract, ContractStatus } from '@features/employee/services/contract.service';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveAllocationService } from '@features/leave/services/leave-allocation.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { UploadService } from '@features/employee/services/upload.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [NgClass, DatePipe, CurrencyPipe, ReactiveFormsModule, FormsModule],
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
  initializingLeave = false; // Add loading state

  // Master Data Maps
  departmentsMap: { [key: string]: string } = {};
  positionsMap: { [key: string]: string } = {};

  // Contract Modal
  isContractModalOpen = false;
  contractForm: FormGroup;
  minStartDate: string; // For date validation

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private empService: EmployeeService,
    private contractService: ContractService,
    private leaveAllocationService: LeaveAllocationService,
    private masterData: MasterDataService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private logger: LoggerService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef
  ) {
    this.minStartDate = new Date().toISOString().split('T')[0];
    
    this.contractForm = this.fb.group({
      contractCode: ['', Validators.required],
      type: ['Fixed-Term', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      basicSalary: [0, [Validators.required, Validators.min(0)]],
      transportAllowance: [0],
      lunchAllowance: [0],
      otherAllowance: [0],
      note: ['']
    });
  }

  ngOnInit() {
    this.loadMasterData(); // Fetch Depts & Positions

    if (this.employeeIdInput) {
      this.employeeId = this.employeeIdInput;
      this.loadData();
    } else {
      this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.employeeId = id;
          this.loadData();
        } else {
          // Only redirect if not in drawer mode (though input should handle it)
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
      // Load Departments from MasterDataService
      this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
              data.forEach(d => {
                  if (d.id) this.departmentsMap[d.id] = d.name;
              });
              this.cdr.markForCheck();
          },
          error: (err) => this.logger.error('Error loading departments', err)
      });

      // Load Positions from MasterDataService
      this.masterData.getPositions$().pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
              data.forEach(p => {
                  if (p.id) this.positionsMap[p.id] = p.title;
              });
              this.cdr.markForCheck();
          },
          error: (err) => this.logger.error('Error loading positions', err)
      });
  }

  getDepartmentName(emp: Employee | null): string {
      if (!emp) return '-';
      const id = emp.jobDetails?.departmentId;
      if (!id) return '-';
      return this.departmentsMap[id] || id; 
  }

  getPositionTitle(emp: Employee | null): string {
      if (!emp) return '-';
      const id = emp.jobDetails?.positionId;
      if (!id) return '-';
      return this.positionsMap[id] || id;
  }

  getStatus(emp: Employee | null): string {
      if (!emp) return 'Unknown';
      return emp.jobDetails?.status || 'Unknown';
  }

  loadData() {
    this.loading = true;
    this.empService.getEmployeeById(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (emp) => {
        this.employee = emp;
        this.loading = false;
        this.loadContracts();
        this.cdr.markForCheck();
      },
      error: (err) => {
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
      next: (data) => {
        this.contracts = data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        this.loadingContracts = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading contracts', err);
        this.toastService.showError('Load Error', 'Could not load contracts');
        this.loadingContracts = false;
        this.cdr.markForCheck();
      }
    });
  }

  // --- Actions ---

  openContractModal() {
    this.isContractModalOpen = true;
    // Generate code
    const randomSuffix = Math.floor(Math.random() * 1000);
    const code = `CNT-${new Date().getFullYear()}-${this.employee?.employeeCode}-${randomSuffix}`;
    
    this.contractForm.reset({
      contractCode: code,
      type: 'Fixed-Term',
      startDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      transportAllowance: 0,
      lunchAllowance: 0,
      otherAllowance: 0
    });
  }

  closeContractModal() {
    this.isContractModalOpen = false;
  }

  saveContract() {
    if (this.contractForm.invalid) return;

    const val = this.contractForm.value;
    const newContract = {
      employeeId: this.employeeId,
      contractCode: val.contractCode,
      type: val.type,
      startDate: val.startDate,
      endDate: val.endDate ? val.endDate : null,
      salary: {
        basicSalary: val.basicSalary,
        transportAllowance: val.transportAllowance,
        lunchAllowance: val.lunchAllowance,
        otherAllowance: val.otherAllowance
      },
      status: 'Active' as ContractStatus,
      note: val.note
    };

    this.contractService.createContract(newContract).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.closeContractModal();
        this.loadContracts();
        this.toastService.showSuccess('Contract Renewed', 'Contract renewed successfully!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to create contract', err);
        this.toastService.showError('Error', err?.error?.message || 'Failed to save contract');
      }
    });
  }
  
  terminateContract(contract: Contract) {
    if (confirm(`Are you sure you want to terminate contract ${contract.contractCode}?`)) {
      if (contract.id) {
        this.contractService.terminateContract(contract.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.showSuccess('Success', 'Contract terminated successfully');
            this.loadContracts();
          },
          error: (err) => {
            this.logger.error('Failed to terminate contract', err);
            this.toastService.showError('Error', err?.error?.message || 'Failed to terminate contract');
          }
        });
      }
    }
  }

  get activeContract(): Contract | undefined {
    return this.contracts.find(c => c.status === 'Active');
  }

  get totalSalary(): number {
    const c = this.activeContract;
    if (!c) return 0;
    return (c.salary.basicSalary || 0) + 
           (c.salary.transportAllowance || 0) + 
           (c.salary.lunchAllowance || 0) + 
           (c.salary.otherAllowance || 0);
  }

  initializeLeave() {
      if (!this.employeeId) return;
      const currentYear = new Date().getFullYear();
      if (!confirm(`Initialize leave allocation for this year (${currentYear})?`)) return;

      this.initializingLeave = true;
      this.leaveAllocationService.initializeAllocation(this.employeeId, currentYear).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
              this.toastService.showSuccess('Initialized', 'Leave allocation initialized successfully');
              this.initializingLeave = false;
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.logger.error('Leave initialization failed', err);
              this.toastService.showError('Error', 'Failed to initialize leave');
              this.initializingLeave = false;
              this.cdr.markForCheck();
          }
      });
  }

  isUploadingDoc = false;

  onDocSelected(event: Event, type: 'resume' | 'contract') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.employee) {
      const folder = type === 'resume' ? 'resumes' : 'contracts';
      // Validate file type and size before uploading
      const validationError = this.uploadService.validateFile(file, folder);
      if (validationError) {
        this.toastService.showError('Invalid File', validationError);
        // Reset input so the same file triggers change again if user picks another
        (event.target as HTMLInputElement).value = '';
        return;
      }
      this.isUploadingDoc = true;
      
      this.uploadService.uploadFile(file, folder).pipe(takeUntil(this.destroy$)).subscribe({
        next: (path) => {
          // Update employee via service
          const updatePayload: Partial<Employee> = {
            id: this.employee!.id,
            fullName: this.employee!.fullName,
            email: this.employee!.email,
            jobDetails: {
              ...this.employee!.jobDetails,
              resumeUrl: type === 'resume' ? path : this.employee!.jobDetails?.resumeUrl,
              contractUrl: type === 'contract' ? path : this.employee!.jobDetails?.contractUrl
            } as Employee['jobDetails']
          };

          this.empService.updateEmployee(this.employee!.id, updatePayload).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.loadData(); // Refresh
              this.toastService.showSuccess('Uploaded', `${type === 'resume' ? 'Resume' : 'Contract'} updated successfully`);
              this.isUploadingDoc = false;
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.logger.error('Update employee after upload failed', err);
              this.toastService.showError('Update Failed', 'File uploaded but could not update employee record');
              this.isUploadingDoc = false;
              this.cdr.markForCheck();
            }
          });
        },
        error: (err) => {
          this.logger.error('File upload failed', err);
          this.toastService.showError('Upload Failed', 'Failed to upload document');
          this.isUploadingDoc = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  getDocName(path: string | undefined): string {
    if (!path) return 'Not Uploaded';
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  downloadDoc(path: string | undefined) {
    if (!path) return;
    const safeUrl = this.uploadService.getFileUrl(path);
    if (!safeUrl) {
      this.toastService.showError('Invalid URL', 'Document URL is not from a trusted source.');
      return;
    }
    // noopener,noreferrer prevents the opened tab from accessing window.opener
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }

  getAvatarUrl(): string {
    return this.uploadService.getFileUrl(this.employee?.avatarUrl);
  }

  trackByIndex(index: number, item?: unknown): number {
    return index;
  }
}
