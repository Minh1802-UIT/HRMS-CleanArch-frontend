import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payroll-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payroll-controls.html',
  styleUrl: './payroll-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollControlsComponent {
  @Input({ required: true }) selectedMonth: string = '';
  @Input({ required: true }) selectedYear: number = new Date().getFullYear();
  @Input({ required: true }) searchKeyword: string = '';
  @Input({ required: true }) calculating: boolean = false;

  @Input() months: { value: string; label: string }[] = [];
  @Input() years: number[] = [];

  @Output() monthChange = new EventEmitter<string>();
  @Output() yearChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() calculate = new EventEmitter<void>();
  @Output() exportCsv = new EventEmitter<void>();
  @Output() exportExcel = new EventEmitter<void>();

  onMonthChange(event: Event) {
    const el = event.target as HTMLSelectElement;
    this.monthChange.emit(el.value);
  }

  onYearChange(event: Event) {
    const el = event.target as HTMLSelectElement;
    this.yearChange.emit(parseInt(el.value, 10));
  }

  onSearchInput(event: Event) {
    const el = event.target as HTMLInputElement;
    this.searchChange.emit(el.value);
  }
}
