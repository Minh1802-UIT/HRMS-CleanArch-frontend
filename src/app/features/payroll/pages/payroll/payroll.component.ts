import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayrollService, PayrollRecord, Payroll } from '@features/payroll/services/payroll.service';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { UploadService } from '@features/employee/services/upload.service';
import { CsvExportService } from '@core/services/csv-export.service';

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
  // ... properties
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
  totalNetSalary: number = 0;

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
      employees: this.employeeService.getLookup(),
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
        // Map data
        this.payrollRecords = this.mapPayrollData(employees, payrolls);
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

  mapPayrollData(employees: Employee[], payrolls: Payroll[]): PayrollRecord[] {
    // If no payrolls exist yet, we can optionally show potential employees or just empty list.
    // Let's show all employees, and fill payroll info if available, or mark as 'Pending' if not.
    
    return employees.map(emp => {
      const payroll = payrolls.find(p => p.employeeCode === emp.employeeCode);
      
      if (payroll) {
        // Found calculated payroll
        return {
          ...payroll,
          employeeName: emp.fullName,
          avatar: emp.avatarUrl ? this.uploadService.getFileUrl(emp.avatarUrl) : `https://ui-avatars.com/api/?name=${emp.fullName}&background=random`,
          displayNetSalary: payroll.finalNetSalary,
          displayWorkingHours: payroll.actualWorkingDays * 8
        } as PayrollRecord;
      } else {
        // Not yet calculated
        return {
          id: '',
          employeeCode: emp.employeeCode || 'Unknown',
          employeeName: emp.fullName,
          month: `${this.selectedMonth}-${this.selectedYear}`,
          grossIncome: 0,
          baseSalary: 0,
          allowances: 0,
          actualWorkingDays: 0,
          totalDeductions: 0,
          finalNetSalary: 0,
          status: 'Pending',
          avatar: emp.avatarUrl ? this.uploadService.getFileUrl(emp.avatarUrl) : `https://ui-avatars.com/api/?name=${emp.fullName}&background=random`,
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
    this.calculating = true;
    
    // Call Bulk Calculation
    this.payrollService.calculatePayroll(this.selectedMonth, this.selectedYear).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
             this.loadPayrollData();
             this.toastService.showSuccess('Calculation Complete', `Payroll calculation completed for ${this.selectedMonth} ${this.selectedYear}`);
             this.calculating = false;
             this.cdr.markForCheck();
        },
        error: (err) => {
             this.logger.error('Payroll calculation error', err);
             this.toastService.showError('Calculation Error', 'Failed to calculate payroll');
             this.calculating = false;
             this.cdr.markForCheck();
        }
    });
  }

  onExport() {
    this.logger.info('Exporting payroll data');
    const monthYear = this.formatMonthYear(this.selectedMonth, this.selectedYear);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private formatMonthYear(monthName: string, year: number): string {
    const monthNum = this.getMonthNumber(monthName);
    return `${monthNum}-${year}`;
  }

  private getMonthNumber(monthName: string): string {
    const months: { [key: string]: string } = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    return months[monthName] || '01';
  }

  exportPayrollCsv(): void {
    if (!this.payrollRecords.length) {
      this.toastService.showWarn('No Data', 'No payroll records to export.');
      return;
    }
    const rows = this.payrollRecords.map(r => ({
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
