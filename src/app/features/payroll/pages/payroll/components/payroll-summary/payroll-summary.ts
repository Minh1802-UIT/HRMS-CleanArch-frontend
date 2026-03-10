import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-payroll-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './payroll-summary.html',
  styleUrl: './payroll-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollSummaryComponent {
  @Input({ required: true }) totalNetSalary: number = 0;
  @Input({ required: true }) totalEmployees: number = 0;
  @Input({ required: true }) titlePeriod: string = '';
}
