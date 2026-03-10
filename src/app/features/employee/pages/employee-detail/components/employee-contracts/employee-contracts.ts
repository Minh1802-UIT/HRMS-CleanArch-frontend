import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ContractService, Contract, ContractStatus } from '@features/employee/services/contract.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { ConfirmDialogService } from '@core/services/confirm-dialog.service';

@Component({
  selector: 'app-employee-contracts',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './employee-contracts.html',
  styleUrl: './employee-contracts.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeContractsComponent {
  @Input({ required: true }) employeeId!: string;
  @Input({ required: true }) employeeCode!: string;
  @Input({ required: true }) contracts: Contract[] = [];
  @Output() reloadContracts = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  isContractModalOpen = false;
  contractForm: FormGroup;
  minStartDate: string;

  constructor(
    private contractService: ContractService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private logger: LoggerService,
    private confirmService: ConfirmDialogService,
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

  get activeContract(): Contract | undefined {
    return this.contracts.find(c => c.status === 'Active');
  }

  openContractModal() {
    this.isContractModalOpen = true;
    const randomSuffix = Math.floor(Math.random() * 1000);
    const code = `CNT-${new Date().getFullYear()}-${this.employeeCode}-${randomSuffix}`;

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
        this.reloadContracts.emit();
        this.toastService.showSuccess('Contract Renewed', 'Contract renewed successfully!');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.logger.error('Failed to create contract', err);
        // FIXME: Replace with proper HttpErrorResponse handling when doing the full API cleanup
        this.toastService.showError('Error', err?.error?.message || 'Failed to save contract');
      }
    });
  }

  terminateContract(contract: Contract) {
    if (!contract.id) return;
    this.confirmService.confirm({
      title: 'Terminate Contract',
      message: `Are you sure you want to terminate contract <strong>${contract.contractCode}</strong>? This action cannot be undone.`,
      type: 'warning',
      confirmLabel: 'Terminate'
    }).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.contractService.terminateContract(contract.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Success', 'Contract terminated successfully');
          this.reloadContracts.emit();
        },
        error: (err: any) => {
          this.logger.error('Failed to terminate contract', err);
          this.toastService.showError('Error', err?.error?.message || 'Failed to terminate contract');
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
