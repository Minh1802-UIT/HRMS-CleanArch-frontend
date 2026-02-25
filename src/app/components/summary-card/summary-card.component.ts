import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() icon: string = '📊';
  @Input() trend?: { value: number; isPositive: boolean };
  @Input() colorScheme: 'blue' | 'green' | 'orange' | 'purple' = 'blue';
}
