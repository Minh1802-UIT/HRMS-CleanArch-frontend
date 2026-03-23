import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { ToastService } from '@core/services/toast.service';
import { Candidate } from '@features/recruitment/models/recruitment.model';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/services/employee.service';

@Component({
  selector: 'app-add-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-interview.component.html',
})
export class AddInterviewComponent implements OnInit {
  @Input() candidate: Candidate | null = null;
  @Input() editInterview: { id: string; candidateId: string; interviewerId: string; scheduledTime: string; durationMinutes: number; location: string; status: string } | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() interviewSaved = new EventEmitter<void>();

  private recruitmentService = inject(RecruitmentService);
  private employeeService = inject(EmployeeService);
  private toastService = inject(ToastService);

  interviewers: Employee[] = [];
  loading = false;
  isEditMode = false;

  form = {
    candidateId: '',
    interviewerId: '',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 60,
    location: 'Online'
  };

  interviewStatuses = ['Scheduled', 'Completed', 'Cancelled', 'NoShow'];

  ngOnInit(): void {
    this.isEditMode = !!this.editInterview;
    if (this.editInterview) {
      const dt = new Date(this.editInterview.scheduledTime);
      this.form = {
        candidateId: this.editInterview.candidateId,
        interviewerId: this.editInterview.interviewerId,
        scheduledDate: dt.toISOString().substring(0, 10),
        scheduledTime: dt.toTimeString().substring(0, 5),
        durationMinutes: this.editInterview.durationMinutes,
        location: this.editInterview.location
      };
    } else if (this.candidate) {
      this.form.candidateId = this.candidate.id;
    }
    this.loadInterviewers();
  }

  loadInterviewers() {
    this.employeeService.getEmployees({ pageSize: 100, pageNumber: 1 }).subscribe({
      next: (result) => this.interviewers = result.items || [],
      error: () => this.toastService.showError('Load Failed', 'Could not load interviewers.')
    });
  }

  onSubmit(): void {
    if (!this.form.candidateId || !this.form.interviewerId || !this.form.scheduledDate || !this.form.scheduledTime) {
      this.toastService.showWarn('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    const scheduledTime = new Date(`${this.form.scheduledDate}T${this.form.scheduledTime}`).toISOString();
    this.loading = true;

    const dto: any = {
      candidateId: this.form.candidateId,
      interviewerId: this.form.interviewerId,
      scheduledTime,
      durationMinutes: this.form.durationMinutes,
      location: this.form.location
    };

    const action$ = this.isEditMode && this.editInterview
      ? this.recruitmentService.updateInterview(this.editInterview.id, dto)
      : this.recruitmentService.createInterview(dto);

    action$.subscribe({
      next: (ok) => {
        this.loading = false;
        if (ok) {
          this.toastService.showSuccess('Success', this.isEditMode ? 'Interview updated.' : 'Interview scheduled.');
          this.interviewSaved.emit();
        } else {
          this.toastService.showError('Error', 'Failed to save interview.');
        }
      },
      error: () => {
        this.loading = false;
        this.toastService.showError('Error', 'Failed to save interview.');
      }
    });
  }
}
