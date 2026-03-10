import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, TemplateRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { PayrollRecord } from '@features/payroll/services/payroll.service';

@Component({
  selector: 'app-payroll-table',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './payroll-table.html',
  styleUrl: './payroll-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollTableComponent {
  @Input({ required: true }) records: PayrollRecord[] = [];
  @Input({ required: true }) loading: boolean = false;
  @Input({ required: true }) searchKeyword: string = '';
  @Input() markingPaidId: string | null = null;
  @Input() approvingId: string | null = null;
  @Input() calculationTemplate!: TemplateRef<any>;

  @Output() approve = new EventEmitter<PayrollRecord>();
  @Output() markAsPaid = new EventEmitter<PayrollRecord>();
  @Output() downloadPdf = new EventEmitter<PayrollRecord>();

  get filteredRecords(): PayrollRecord[] {
    if (!this.searchKeyword) return this.records;
    const lower = this.searchKeyword.toLowerCase();
    return this.records.filter(r =>
      r.employeeName.toLowerCase().includes(lower) ||
      r.employeeCode.toLowerCase().includes(lower)
    );
  }

  isPaid(status: string): boolean {
    return status === 'Paid';
  }

  trackByIndex(index: number): number {
    return index;
  }
}
