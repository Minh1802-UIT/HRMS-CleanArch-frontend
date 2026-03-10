import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Employee } from '@features/employee/services/employee.service';

@Component({
  selector: 'app-employee-personal-info',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './employee-personal-info.html',
  styleUrl: './employee-personal-info.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeePersonalInfoComponent {
  @Input({ required: true }) employee!: Employee;
}
