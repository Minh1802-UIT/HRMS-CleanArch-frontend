import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { PayrollService, PayrollRecord, Payroll } from '@features/payroll/services/payroll.service';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { UploadService } from '@features/employee/services/upload.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { formatMonthYear } from '@shared/utils/date.utils';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  selectedMonth: string = new Date().toLocaleString('en-US', { month: 'long' });
  selectedYear: number = new Date().getFullYear();
  
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  years: number[] = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
  
  payrollRecords: PayrollRecord[] = [];
  loading: boolean = false;
  calculating: boolean = false;
  markingPaid: string | null = null;
  totalNetSalary: number = 0;

  // Search
  searchKeyword: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  readonly pageSizeOptions = [10, 20, 50];

  // Confirmation dialog state
  showConfirmDialog: boolean = false;
  confirmTitle: string = '';
  confirmMessage: string = '';
  private _pendingAction: (() => void) | null = null;

  get filteredRecords(): PayrollRecord[] {
    const kw = this.searchKeyword.trim().toLowerCase();
    if (!kw) return this.payrollRecords;
    return this.payrollRecords.filter(r =>
      (r.employeeName?.toLowerCase().includes(kw)) ||
      (r.employeeCode?.toLowerCase().includes(kw))
    );
  }

  get pagedRecords(): PayrollRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  onSearch() {
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private toastService: ToastService,
    private logger: LoggerService,
    private uploadService: UploadService,
    private csvExport: CsvExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPayrollData();
  }

  loadPayrollData() {
    this.loading = true;
    
    // 1. Fetch Employees (to get Names/Avatars)
    // 2. Fetch Payroll Data (Backend DTO)
    forkJoin({
      employees: this.employeeService.getLookup('', 500).pipe(map(res => res as any[])), // limit=500 — lấy toàn bộ nhân viên
      payrolls: this.payrollService.getPayrollData(this.selectedMonth, this.selectedYear).pipe(
          catchError(err => {
              this.logger.warn('No payroll data found', err);
              return of([] as Payroll[]); // Return empty if 404
          })
      )
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ employees, payrolls }) => {
        this.payrollRecords = this.mapPayrollData(employees, payrolls);
        this.currentPage = 1;
        this.calculateTotals();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading payroll data', err);
        this.toastService.showError('Load Error', 'Failed to load payroll data');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  mapPayrollData(employees: any[], payrolls: Payroll[]): PayrollRecord[] {
    // If no payrolls exist yet, we can optionally show potential employees or just empty list.
    // Let's show all employees, and fill payroll info if available, or mark as 'Pending' if not.
    
    return employees.map(emp => {
      // LookupDto uses 'secondaryLabel' for employeeCode and 'label' for fullName
      const code = emp.secondaryLabel || emp.employeeCode || 'Unknown';
      const name = emp.label || emp.fullName || 'Unknown';
      
      const payroll = payrolls.find(p => p.employeeCode === code);
      
      if (payroll) {
        // Found calculated payroll
        return {
          ...payroll,
          employeeName: name,
          avatar: emp.avatarUrl ? this.uploadService.getFileUrl(emp.avatarUrl) : `https://ui-avatars.com/api/?name=${name}&background=random`,
          displayNetSalary: payroll.finalNetSalary,
          displayWorkingHours: payroll.actualWorkingDays * 8
        } as PayrollRecord;
      } else {
        // Not yet calculated
        return {
          id: '',
          employeeCode: code,
          employeeName: name,
          month: `${this.selectedMonth}-${this.selectedYear}`,
          grossIncome: 0,
          baseSalary: 0,
          allowances: 0,
          actualWorkingDays: 0,
          totalDeductions: 0,
          finalNetSalary: 0,
          status: 'Pending',
          avatar: emp.avatarUrl ? this.uploadService.getFileUrl(emp.avatarUrl) : `https://ui-avatars.com/api/?name=${name}&background=random`,
          displayNetSalary: 0,
          displayWorkingHours: 0
        } as PayrollRecord;
      }
    });
  }

  calculateTotals() {
    this.totalNetSalary = this.payrollRecords.reduce((sum, record) => sum + (record.finalNetSalary || 0), 0);
  }

  onCalculate() {
    this.confirmTitle = 'Run Payroll Calculation';
    this.confirmMessage = `Tính lương lại cho khỳ ${this.selectedMonth} ${this.selectedYear}?\nHành động này sẽ ghi đè tất cả bảng lương chưa thanh toán.`;
    this._pendingAction = () => this._doCalculate();
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private _doCalculate() {
    this.calculating = true;
    this.payrollService.calculatePayroll(this.selectedMonth, this.selectedYear).pipe(takeUntil(this.destroy$)).subscribe({
        next: (count) => {
             this.calculating = false;
             this.cdr.markForCheck();
             this.loadPayrollData();
             this.toastService.showSuccess('Calculation Complete', `Processed ${count} record(s) for ${this.selectedMonth} ${this.selectedYear}`);
        },
        error: (err) => {
             this.logger.error('Payroll calculation error', err);
             this.toastService.showError('Calculation Error', 'Failed to calculate payroll');
             this.calculating = false;
             this.cdr.markForCheck();
        }
    });
  }

  onMarkAsPaid(record: PayrollRecord) {
    if (!record.id) {
      this.toastService.showWarn('Not Calculated', 'Please calculate payroll before marking as paid');
      return;
    }
    if (record.status === 'Paid') {
      this.toastService.showWarn('Already Paid', 'This payroll record is already marked as Paid');
      return;
    }
    this.confirmTitle = 'Mark as Paid';
    this.confirmMessage = `Xác nhận đã thanh toán lương cho ${record.employeeName}?\nHanh động này không thể hoàn tác.`;
    this._pendingAction = () => this._doMarkAsPaid(record);
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  private _doMarkAsPaid(record: PayrollRecord) {
    this.markingPaid = record.id;
    this.payrollService.markAsPaid(record.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        record.status = 'Paid';
        this.markingPaid = null;
        this.cdr.markForCheck();
        this.toastService.showSuccess('Marked as Paid', `Lương của ${record.employeeName} đã được thanh toán.`);
      },
      error: (err) => {
        this.logger.error('Mark as paid error', err);
        this.toastService.showError('Failed', 'Could not mark payroll as Paid');
        this.markingPaid = null;
        this.cdr.markForCheck();
      }
    });
  }

  confirmExecute() {
    this.showConfirmDialog = false;
    this.cdr.markForCheck();
    if (this._pendingAction) {
      this._pendingAction();
      this._pendingAction = null;
    }
  }

  confirmCancel() {
    this.showConfirmDialog = false;
    this._pendingAction = null;
    this.cdr.markForCheck();
  }

  onExport() {
    this.logger.info('Exporting payroll data');
    const monthYear = formatMonthYear(this.selectedMonth, this.selectedYear);
    this.toastService.showInfo('Exporting', `Generating Payroll_${monthYear}.xlsx...`);

    this.payrollService.exportPayroll(monthYear).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Payroll_${monthYear}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Export Success', `Payroll report for ${monthYear} downloaded.`);
      },
      error: (err) => {
        this.logger.error('Excel export error', err);
        this.toastService.showError('Export Failed', 'Failed to export payroll Excel');
      }
    });
  }

  onDownloadPdf(record: PayrollRecord) {
    if (!record.id) {
      this.toastService.showWarn('Not Calculated', 'Please calculate payroll before exporting PDF');
      return;
    }

    this.payrollService.downloadPayslip(record.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Payslip_${record.employeeCode}_${this.selectedMonth}_${this.selectedYear}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Export Success', `Payslip for ${record.employeeName} downloaded.`);
      },
      error: (err) => {
        this.logger.error('PDF download error', err);
        this.toastService.showError('Export Failed', 'Failed to download payslip PDF');
      }
    });
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }



  exportPayrollCsv(): void {
    const source = this.filteredRecords; // export theo kết quả search hiện tại
    if (!source.length) {
      this.toastService.showWarn('No Data', 'No payroll records to export.');
      return;
    }
    const rows = source.map(r => ({
      EmployeeCode: r.employeeCode || '',
      Name: r.employeeName || '',
      Month: r.month || `${this.selectedMonth}-${this.selectedYear}`,
      BaseSalary: r.baseSalary ?? 0,
      Allowances: r.allowances ?? 0,
      GrossIncome: r.grossIncome ?? 0,
      TotalDeductions: r.totalDeductions ?? 0,
      NetSalary: r.finalNetSalary ?? 0,
      Status: r.status || ''
    }));
    const filename = `Payroll_${this.selectedMonth}_${this.selectedYear}`;
    this.csvExport.export(rows, filename);
    this.toastService.showSuccess('Exported', `${rows.length} payroll records exported to CSV.`);
  }

  trackByMonth(index: number, month: string): string { return month; }
  trackByYear(index: number, year: number): number { return year; }
  trackByRecord(index: number, record: PayrollRecord): string { return record.employeeCode || String(index); }
}
