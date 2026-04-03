import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayrollService, PayrollRecord } from '@features/payroll/services/payroll.service';
import { ConfirmDialogService } from '@core/services/confirm-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

import { PayrollSummaryComponent } from './components/payroll-summary/payroll-summary';
import { PayrollControlsComponent } from './components/payroll-controls/payroll-controls';
import { PayrollTableComponent } from './components/payroll-table/payroll-table';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    PayrollSummaryComponent,
    PayrollControlsComponent,
    PayrollTableComponent
  ],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollComponent implements OnInit, OnDestroy {
  payrollRecords: PayrollRecord[] = [];
  loading = false;
  calculating = false;
  markingPaidId: string | null = null;
  approvingId: string | null = null;
  private destroy$ = new Subject<void>();

  // Filter state
  selectedMonth: string;
  selectedYear: number;
  searchKeyword: string = '';

  months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  years: number[] = [];

  constructor(
    private titleService: Title,
    private payrollService: PayrollService,
    private confirmService: ConfirmDialogService,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    this.titleService.setTitle('Payroll Management - HRMS');
    const now = new Date();
    this.selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    // If it's January, default to calculating December of previous year
    if (this.selectedMonth === '01') {
      this.selectedMonth = '12';
      this.selectedYear = now.getFullYear() - 1;
    } else {
      this.selectedMonth = String(now.getMonth() + 1).padStart(2, '0'); // +1 because getMonth() is 0-indexed
      this.selectedYear = now.getFullYear();
    }

    // Generate years dynamically (e.g. 5 years back, 1 year forward)
    const currentYear = now.getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  ngOnInit() {
    this.loadPayroll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get periodFormat(): string {
    return `${this.selectedYear}-${this.selectedMonth}-01`;
  }

  get titlePeriod(): string {
    const m = this.months.find(m => m.value === this.selectedMonth)?.label || '';
    return `${m} ${this.selectedYear}`;
  }

  get totalNetSalary(): number {
    return this.payrollRecords.reduce((sum, record) => sum + record.finalNetSalary, 0);
  }

  loadPayroll() {
    this.loading = true;
    this.payrollService.getPayrollData(this.selectedMonth, this.selectedYear).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: PayrollRecord[]) => {
        this.payrollRecords = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.logger.error('Failed to load payroll', err);
        this.toastService.showError('Error', err?.error?.message || 'Failed to load payroll records for ' + this.titlePeriod);
        this.loading = false;
        this.payrollRecords = [];
        this.cdr.markForCheck();
      }
    });
  }

  onMonthChange(month: string) {
    this.selectedMonth = month;
    this.loadPayroll();
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.loadPayroll();
  }

  onSearchChange(keyword: string) {
    this.searchKeyword = keyword;
    this.cdr.markForCheck();
  }

  runCalculation() {
    this.confirmAndCalculate();
  }

  approvePayroll(record: PayrollRecord) {
    if (record.status !== 'Draft') return;
    this.confirmAndApprove(record);
  }

  markAsPaid(record: PayrollRecord) {
    if (record.status === 'Paid') return;
    this.confirmAndMarkPaid(record);
  }

  downloadPdf(record: PayrollRecord) {
    this.toastService.showInfo('Coming Soon', 'PDF Payslip generation is not implemented on the backend yet.');
  }

  exportCsv() {
    this.toastService.showInfo('Coming Soon', 'CSV Export feature will be implemented soon.');
  }

  exportExcel() {
    const monthYear = `${this.selectedMonth}-${this.selectedYear}`;
    this.payrollService.exportPayroll(monthYear).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_${this.selectedYear}_${this.selectedMonth}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Exported', 'Excel file downloaded successfully');
      },
      error: (err: any) => {
        this.logger.error('Export failed', err);
        this.toastService.showError('Export Failed', err?.error?.message || 'Could not generate Excel file');
      }
    });
  }

  // ── Private confirm helpers (prevent memory leaks) ──────────────────────────
  private confirmAndCalculate(): void {
    this.confirmService.confirm({
      title: 'Calculate Payroll',
      message: `Are you sure you want to run the payroll calculation for ${this.titlePeriod}?\nThis will overwrite any existing Draft calculations for this period.`,
      type: 'warning',
      confirmLabel: 'Calculate Now'
    }).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.calculating = true;
      this.cdr.markForCheck();
      this.payrollService.calculatePayroll(this.selectedMonth, this.selectedYear).pipe(takeUntil(this.destroy$)).subscribe({
        next: (count: number) => {
          this.calculating = false;
          this.toastService.showSuccess('Success', `Payroll calculated for ${count} employees`);
          this.cdr.markForCheck();
          this.loadPayroll();
        },
        error: (err: any) => {
          this.logger.error('Calculation Failed', err);
          this.toastService.showError('Calculation Failed', err?.error?.message || 'Failed to calculate payroll');
          this.calculating = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  private confirmAndApprove(record: PayrollRecord): void {
    this.confirmService.confirm({
      title: 'Approve Payroll',
      message: `Approve the payroll calculation for ${record.employeeName}?`,
      type: 'info',
      confirmLabel: 'Approve'
    }).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.approvingId = record.id;
      this.cdr.markForCheck();
      this.payrollService.updateStatus(record.id, 'Approved').pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const index = this.payrollRecords.findIndex(r => r.id === record.id);
          if (index !== -1) {
            this.payrollRecords = [
              ...this.payrollRecords.slice(0, index),
              { ...this.payrollRecords[index], status: 'Approved' as const },
              ...this.payrollRecords.slice(index + 1)
            ];
          }
          this.toastService.showSuccess('Success', 'Payroll approved');
          this.approvingId = null;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.logger.error('Failed to approve payroll', err);
          this.toastService.showError('Error', err?.error?.message || 'Failed to update status');
          this.approvingId = null;
          this.cdr.markForCheck();
        }
      });
    });
  }

  private confirmAndMarkPaid(record: PayrollRecord): void {
    this.confirmService.confirm({
      title: 'Confirm Payment',
      message: `Mark the payroll record for ${record.employeeName} as Paid?`,
      type: 'info',
      confirmLabel: 'Confirm'
    }).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.markingPaidId = record.id;
      this.cdr.markForCheck();
      this.payrollService.updateStatus(record.id, 'Paid').pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const index = this.payrollRecords.findIndex(r => r.id === record.id);
          if (index !== -1) {
            this.payrollRecords = [
              ...this.payrollRecords.slice(0, index),
              { ...this.payrollRecords[index], status: 'Paid' as const },
              ...this.payrollRecords.slice(index + 1)
            ];
          }
          this.toastService.showSuccess('Success', 'Payment confirmed');
          this.markingPaidId = null;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.logger.error('Failed to mark as paid', err);
          this.toastService.showError('Error', err?.error?.message || 'Failed to update status');
          this.markingPaidId = null;
          this.cdr.markForCheck();
        }
      });
    });
  }
}
