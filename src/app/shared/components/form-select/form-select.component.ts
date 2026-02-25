import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Shared Form Select Component
 * 
 * Reusable dropdown/select field with label and validation error display.
 * Automatically iterates over options array.
 * 
 * @example
 * <app-form-select
 *   [formGroup]="myForm"
 *   formControlName="department"
 *   label="Department"
 *   [options]="departments"
 *   optionValue="id"
 *   optionLabel="name"
 *   placeholder="Select Department"
 *   [required]="true"
 *   errorMessage="Department is required.">
 * </app-form-select>
 */
@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './form-select.component.html',
  styleUrls: ['./form-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormSelectComponent {
  @Input() label: string = '';
  @Input() controlName: string = '';
  @Input() formGroup!: FormGroup;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() options: any[] = [];
  @Input() optionValue: string = 'id'; // Property to use as option value
  @Input() optionLabel: string = 'name'; // Property to display as option label
  @Input() placeholder: string = 'Select...';
  @Input() required: boolean = false;
  @Input() errorMessage: string = 'Please select an option.';

  /**
   * Check if the form control is invalid and has been touched
   */
  get showError(): boolean {
    const control = this.formGroup.get(this.controlName);
    return !!(control && control.invalid && control.touched);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackByOption(index: number, option: any): unknown {
    return option?.[this.optionValue] ?? index;
  }
}
