import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../features/payroll/services/payroll.service';
import { AnnualTaxReport, EmployeeTaxSummary } from '../../features/payroll/models/payroll.model';
import { CsvExportService } from '../../core/services/csv-export.service';

@Component({
  selector: 'app-tax-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tax-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxReportComponent implements OnInit {
  selectedYear: number = new Date().getFullYear();
  yearOptions: number[] = [];
  report: AnnualTaxReport | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private payrollService: PayrollService,
    private csvService: CsvExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const current = new Date().getFullYear();
    this.yearOptions = [current - 2, current - 1, current, current + 1];
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.report = null;
    this.payrollService.getTaxReport(this.selectedYear).subscribe({
      next: data => {
        this.report = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load tax report. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleExpand(emp: EmployeeTaxSummary): void {
    emp.expanded = !emp.expanded;
    this.cdr.markForCheck();
  }

  exportCsv(): void {
    if (!this.report) return;

    const rows = this.report.employees.flatMap(emp =>
      emp.monthlySummaries.map(m => ({
        employee_code: emp.employeeCode,
        employee_name: emp.employeeName,
        month: m.month,
        gross_income: m.grossIncome,
        social_insurance: m.socialInsurance,
        health_insurance: m.healthInsurance,
        unemployment_insurance: m.unemploymentInsurance,
        taxable_income: m.taxableIncome,
        personal_income_tax: m.personalIncomeTax,
        net_income: m.finalNetSalary
      }))
    );

    this.csvService.export(rows, `annual-tax-report-${this.selectedYear}`, [
      'Employee Code', 'Employee Name', 'Month',
      'Gross Income', 'Social Insurance', 'Health Insurance', 'Unemployment Insurance',
      'Taxable Income', 'PIT', 'Net Income'
    ]);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  }
}
