import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Shared Form Input Component
 * 
 * Reusable input field with label and validation error display.
 * Supports text, email, date, number, and other HTML5 input types.
 * 
 * @example
 * <app-form-input
 *   [formGroup]="myForm"
 *   formControlName="firstName"
 *   label="First Name"
 *   placeholder="e.g. Jane"
 *   [required]="true"
 *   errorMessage="First Name is required.">
 * </app-form-input>
 */
@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrls: ['./form-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormInputComponent {
  @Input() label: string = '';
  @Input() controlName: string = '';
  @Input() formGroup!: FormGroup;
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() required: boolean = false;
  @Input() errorMessage: string = 'This field is required.';

  /**
   * Check if the form control is invalid and has been touched
   */
  get showError(): boolean {
    const control = this.formGroup.get(this.controlName);
    return !!(control && control.invalid && control.touched);
  }
}
