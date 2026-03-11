import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { ToastService } from '@core/services/toast.service';
import { JobVacancy, Candidate } from '@features/recruitment/models/recruitment.model';

@Component({
  selector: 'app-add-candidate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-candidate.component.html',
})
export class AddCandidateComponent implements OnInit {
  @Input() editCandidate: Candidate | null = null;
  @Input() jobs: JobVacancy[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() candidateSaved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private recruitmentService = inject(RecruitmentService);
  private toastService = inject(ToastService);

  candidateForm!: FormGroup;
  loading = false;
  isEditMode = false;
  isParsing = false;

  statuses = ['New', 'Screening', 'Interview', 'Technical Test', 'Offer', 'Hired', 'Rejected'];

  ngOnInit(): void {
    this.isEditMode = !!this.editCandidate;
    this.initForm();
  }

  initForm(): void {
    this.candidateForm = this.fb.group({
      fullName: [this.editCandidate?.fullName || this.editCandidate?.name || '', Validators.required],
      email: [this.editCandidate?.email || '', [Validators.required, Validators.email]],
      phone: [this.editCandidate?.phone || '', Validators.required],
      jobVacancyId: [this.editCandidate?.jobVacancyId || '', Validators.required],
      status: [this.editCandidate?.status || 'New', Validators.required],
      resumeUrl: [this.editCandidate?.resumeUrl || '', Validators.required],
      appliedDate: [this.editCandidate?.appliedDate ? new Date(this.editCandidate.appliedDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10), Validators.required]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.parseCv(file);
      // Reset input so the same file can be selected again if needed
      input.value = '';
    }
  }

  parseCv(file: File): void {
    if (file.type !== 'application/pdf') {
      this.toastService.showWarn('Invalid File', 'Please upload a PDF file for AI parsing.');
      return;
    }

    this.isParsing = true;
    this.recruitmentService.parseCv(file).subscribe({
      next: (data) => {
        this.isParsing = false;
        if (data) {
          const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
          this.candidateForm.patchValue({
            fullName: fullName || this.candidateForm.value.fullName,
            email: data.email || this.candidateForm.value.email,
            phone: data.phoneNumber || this.candidateForm.value.phone,
          });
          this.toastService.showSuccess('AI Success', 'CV parsed successfully');
        } else {
          this.toastService.showError('AI Error', 'Failed to extract data from CV');
        }
      },
      error: () => {
        this.isParsing = false;
        this.toastService.showError('AI Error', 'An error occurred while parsing CV');
      }
    });
  }

  onSubmit(): void {
    if (this.candidateForm.invalid) {
      this.candidateForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.candidateForm.value;
    
    const dto: Partial<Candidate> = {
      fullName: formValue.fullName,
      email: formValue.email,
      phone: formValue.phone,
      jobVacancyId: formValue.jobVacancyId,
      status: formValue.status,
      resumeUrl: formValue.resumeUrl,
      appliedDate: new Date(formValue.appliedDate).toISOString()
    };

    if (this.isEditMode && this.editCandidate) {
      this.recruitmentService.updateCandidate(this.editCandidate.id, dto).subscribe({
        next: (success) => {
          this.loading = false;
          if (success) {
            this.toastService.showSuccess('Success', 'Candidate updated.');
            this.candidateSaved.emit();
          } else {
            this.toastService.showError('Error', 'Failed to update candidate.');
          }
        },
        error: () => {
          this.loading = false;
          this.toastService.showError('Error', 'Failed to update candidate.');
        }
      });
    } else {
      this.recruitmentService.createCandidate(dto).subscribe({
        next: (res) => {
          this.loading = false;
          if (res) {
            this.toastService.showSuccess('Success', 'Candidate added.');
            this.candidateSaved.emit();
          } else {
            this.toastService.showError('Error', 'Failed to add candidate.');
          }
        },
        error: () => {
          this.loading = false;
          this.toastService.showError('Error', 'Failed to add candidate.');
        }
      });
    }
  }
}
