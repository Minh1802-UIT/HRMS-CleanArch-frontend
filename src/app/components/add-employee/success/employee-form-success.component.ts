import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';


/**
 * Employee Form Success Component
 * 
 * Displays success screen after employee creation/update.
 * Shows employee code and provides options to finish or add another employee.
 */
@Component({
  selector: 'app-employee-form-success',
  standalone: true,
  imports: [],
  templateUrl: './employee-form-success.component.html',
  styleUrls: ['./employee-form-success.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeFormSuccessComponent {
  @Input() employeeCode: string = '';
  @Input() employeeName: string = '';
  @Input() isEditMode: boolean = false;
  
  @Output() done = new EventEmitter<void>();
  @Output() addAnother = new EventEmitter<void>();
  @Output() viewProfile = new EventEmitter<void>();
}
