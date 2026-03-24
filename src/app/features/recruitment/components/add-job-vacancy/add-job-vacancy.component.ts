import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { ToastService } from '@core/services/toast.service';
import { JobVacancy } from '@features/recruitment/models/recruitment.model';

@Component({
  selector: 'app-add-job-vacancy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-job-vacancy.component.html',
})
export class AddJobVacancyComponent implements OnInit {
  @Input() editJob: JobVacancy | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() jobSaved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private toastService = inject(ToastService);

  jobForm!: FormGroup;
  loading = false;
  isEditMode = false;

  departments: string[] = ['Products', 'Marketing', 'Sales', 'HR', 'Engineering'];
  offices: string[] = ['New York', 'London', 'Remote', 'San Francisco'];
  employmentTypes: string[] = ['Full time', 'Part time', 'Contract', 'Internship'];
  statuses = ['Draft', 'Published', 'Closed'];

  ngOnInit(): void {
    this.isEditMode = !!this.editJob;
    this.initForm();
    this.loadOptions();
  }

  loadOptions() {
    this.recruitmentService.getRecruitmentOptions().subscribe(opts => {
      if (opts) {
        this.offices = opts.offices;
        this.employmentTypes = opts.employmentTypes;
      }
    });
  }

  initForm(): void {
    this.jobForm = this.fb.group({
      title: [this.editJob?.title || '', Validators.required],
      description: [this.editJob?.description || '', Validators.required],
      vacancies: [this.editJob?.vacancies || 1, [Validators.required, Validators.min(1)]],
      department: [this.editJob?.department || 'Products', Validators.required],
      office: [this.editJob?.office || 'Remote', Validators.required],
      employmentType: [this.editJob?.employmentType || 'Full time', Validators.required],
      status: [this.editJob?.status || 'Draft', Validators.required],
      expiredDate: [this.editJob?.expiredDate ? new Date(this.editJob.expiredDate).toISOString().substring(0, 10) : '', Validators.required],
      requirements: [this.editJob?.requirements?.join('\n') || '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.jobForm.value;
    
    // Parse requirements back to array
    const requirementsArray = formValue.requirements
      .split('\n')
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    const dto: Partial<JobVacancy> = {
      title: formValue.title,
      description: formValue.description,
      vacancies: formValue.vacancies,
      department: formValue.department,
      office: formValue.office,
      employmentType: formValue.employmentType,
      status: formValue.status,
      expiredDate: new Date(formValue.expiredDate).toISOString(),
      requirements: requirementsArray
    };

    if (this.isEditMode && this.editJob) {
      this.recruitmentService.updateVacancy(this.editJob.id, dto).subscribe({
        next: (success) => {
          this.loading = false;
          if (success) {
            this.toastService.showSuccess('Success', 'Job vacancy updated.');
            this.jobSaved.emit();
          } else {
            this.toastService.showError('Error', 'Failed to update job vacancy.');
          }
        },
        error: () => {
          this.loading = false;
          this.toastService.showError('Error', 'Failed to update job vacancy.');
        }
      });
    } else {
      this.recruitmentService.createVacancy(dto).subscribe({
        next: (res) => {
          this.loading = false;
          if (res) {
            this.toastService.showSuccess('Success', 'Job vacancy created.');
            this.jobSaved.emit();
          } else {
            this.toastService.showError('Error', 'Failed to create job vacancy.');
          }
        },
        error: () => {
          this.loading = false;
          this.toastService.showError('Error', 'Failed to create job vacancy.');
        }
      });
    }
  }
}
