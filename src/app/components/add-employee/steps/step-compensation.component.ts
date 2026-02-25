import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';

/**
 * Step 3: Compensation Component
 * 
 * Form for collecting bank details for salary payment:
 * - Bank Name
 * - Account Number
 * - Account Holder Name
 */
@Component({
  selector: 'app-step-compensation',
  standalone: true,
  imports: [ReactiveFormsModule, FormInputComponent],
  templateUrl: './step-compensation.component.html',
  styleUrls: ['./step-compensation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepCompensationComponent {
  @Input() formGroup!: FormGroup; // compensation FormGroup
}
