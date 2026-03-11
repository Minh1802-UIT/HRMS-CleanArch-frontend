import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { JobVacancy } from '@features/recruitment/models/recruitment.model';

@Component({
  selector: 'app-job-vacancy-detail',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './job-vacancy-detail.component.html',
})
export class JobVacancyDetailComponent {
  @Input({ required: true }) job!: JobVacancy;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<JobVacancy>();
}
