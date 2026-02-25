import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Contract, ContractService } from '@features/employee/services/contract.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';
import { FormSelectComponent } from '../../../shared/components/form-select/form-select.component';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-contract-management',
  standalone: true,
  imports: [NgClass, DatePipe, CurrencyPipe, ReactiveFormsModule, FormInputComponent, FormSelectComponent],
  templateUrl: './contract-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractManagementComponent implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() employeeId!: string;
  
  contracts: Contract[] = [];
  showModal = false;
  isEditing = false;
  contractForm: FormGroup;
  currentContractId?: string;
  canEdit = false;

  constructor(
    private contractService: ContractService,
    private toast: ToastService,
    private fb: FormBuilder,
    private authService: AuthService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    this.contractForm = this.fb.group({
      contractCode: ['', Validators.required],
      type: ['Fixed-Term', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      status: ['Active'],
      note: [''],
      salary: this.fb.group({
          basicSalary: [0, [Validators.required, Validators.min(0)]],
          transportAllowance: [0],
          lunchAllowance: [0],
          otherAllowance: [0]
      })
    });
  }

  ngOnInit(): void {
    this.checkPermissions();
    if (this.employeeId) {
      this.loadContracts();
    }
  }

  checkPermissions() {
    const user = this.authService.currentUserValue;
    if (user && user.roles) {
        this.canEdit = user.roles.includes('Admin') || user.roles.includes('HR');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
      if (changes['employeeId'] && this.employeeId) {
          this.logger.debug('ContractManagement: employeeId changed to', this.employeeId);
          this.loadContracts();
      }
  }

  loadContracts() {
    if (!this.employeeId) return;
    this.logger.debug('Loading contracts for:', this.employeeId);
    this.contractService.getContractsByEmployee(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.contracts = data;
        this.logger.debug('Contracts loaded:', data);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load contracts', err);
        this.toast.showError('Error', 'Failed to load contracts');
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.currentContractId = undefined;
    this.contractForm.reset({
        type: 'Fixed-Term',
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0], // Default today
        salary: {
            basicSalary: 0,
            transportAllowance: 0,
            lunchAllowance: 0,
            otherAllowance: 0
        }
    });
    this.showModal = true;
  }

  openEditModal(contract: Contract) {
    this.isEditing = true;
    this.currentContractId = contract.id;
    
    // Patch form
    this.contractForm.patchValue({
        ...contract,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : ''
    });
    
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveContract() {
    if (this.contractForm.invalid) return;

    const formValue = this.contractForm.value;
    const contractData = {
        ...formValue,
        employeeId: this.employeeId,
        // Ensure dates are properly formatted if needed
    };

    if (this.isEditing && this.currentContractId) {
        this.contractService.updateContract(this.currentContractId, contractData).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.toast.showSuccess('Success', 'Contract updated successfully');
                this.loadContracts();
                this.closeModal();
                this.cdr.markForCheck();
            },
            error: (err) => {
                 this.toast.showError('Error', 'Failed to update contract');
            }
        });
    } else {
        this.contractService.createContract(contractData).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.toast.showSuccess('Success', 'Contract created successfully');
                this.loadContracts();
                this.closeModal();
                this.cdr.markForCheck();
            },
            error: (err) => {
                 this.toast.showError('Error', 'Failed to create contract');
            }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByIndex(index: number, item?: unknown): number {
    return index;
  }
}
