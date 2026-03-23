import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { JobVacancy } from '@features/recruitment/models/recruitment.model';
import { RecruitmentService } from '@features/recruitment/services/recruitment.service';
import { ToastService } from '@core/services/toast.service';

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
  @Output() deleted = new EventEmitter<string>();
  @Output() closed = new EventEmitter<string>();

  private recruitmentService = inject(RecruitmentService);
  private toastService = inject(ToastService);

  isClosing = false;
  isDeleting = false;

  get statusBadgeClass(): string {
    switch (this.job?.status) {
      case 'Published': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Draft': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  onEdit() {
    this.edit.emit(this.job);
  }

  onCloseVacancy() {
    if (!confirm(`Close the job vacancy "${this.job.title}"? Candidates will still be accessible but the position will no longer accept new applications.`)) {
      return;
    }
    this.isClosing = true;
    this.recruitmentService.updateVacancy(this.job.id, { status: 'Closed' }).subscribe({
      next: (ok) => {
        this.isClosing = false;
        if (ok) {
          this.toastService.showSuccess('Vacancy Closed', `"${this.job.title}" has been closed.`);
          this.job.status = 'Closed';
          this.closed.emit(this.job.id);
        } else {
          this.toastService.showError('Close Failed', 'Could not close the vacancy.');
        }
      },
      error: () => {
        this.isClosing = false;
        this.toastService.showError('Close Failed', 'Could not close the vacancy.');
      }
    });
  }

  onDelete() {
    if (!confirm(`Permanently delete the job vacancy "${this.job.title}"? This action cannot be undone.`)) {
      return;
    }
    this.isDeleting = true;
    this.recruitmentService.deleteVacancy(this.job.id).subscribe({
      next: (ok) => {
        this.isDeleting = false;
        if (ok) {
          this.toastService.showSuccess('Deleted', `"${this.job.title}" has been deleted.`);
          this.deleted.emit(this.job.id);
          this.close.emit();
        } else {
          this.toastService.showError('Delete Failed', 'Could not delete the vacancy.');
        }
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Delete Failed', 'Could not delete the vacancy.');
      }
    });
  }
}
