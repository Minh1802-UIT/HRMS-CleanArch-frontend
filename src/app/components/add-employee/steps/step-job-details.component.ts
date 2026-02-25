import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';
import { FormSelectComponent } from '../../../shared/components/form-select/form-select.component';
import { Shift } from '@features/attendance/models/shift.model';
import { Employee } from '@features/employee/models/employee.model';

/**
 * Step 2: Job Details Component
 * 
 * Form for collecting employee job information:
 * - Position, Department
 * - Employment Type
 * - Join Date, Work Location
 */
@Component({
  selector: 'app-step-job-details',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, FormInputComponent, FormSelectComponent],
  templateUrl: './step-job-details.component.html',
  styleUrls: ['./step-job-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepJobDetailsComponent {
  @Input() formGroup!: FormGroup; // jobDetails FormGroup
  @Input() departments: Department[] = [];
  @Input() positions: Position[] = [];
  @Input() shifts: Shift[] = [];
  @Input() managers: Employee[] = [];

  setEmploymentType(type: string) {
    this.formGroup.get('employmentType')?.setValue(type);
  }

  getEmploymentType(): string {
    return this.formGroup.get('employmentType')?.value;
  }

  setWorkArrangement(arrangement: string) {
    this.formGroup.get('workLocationArrangement')?.setValue(arrangement);
  }

  getWorkArrangement(): string {
    return this.formGroup.get('workLocationArrangement')?.value;
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
}
