import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Step 4: Documents Component
 * 
 * Form for document uploads (currently mock):
 * - Resume
 * - Contract
 */
import { UploadService } from '@features/employee/services/upload.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-step-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-documents.component.html',
  styleUrls: ['./step-documents.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepDocumentsComponent {
  @Input() formGroup!: FormGroup; 
  @Input() loading = false;
  @Input() isEditMode = false;
  
  uploadingResume = false;
  uploadingContract = false;
  resumePath: string | null = null;
  contractPath: string | null = null;

  constructor(private uploadService: UploadService, private logger: LoggerService, private cdr: ChangeDetectorRef) {}

  onResumeSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadingResume = true;
      this.uploadService.uploadFile(file, 'resumes').subscribe({
        next: (path) => {
          this.resumePath = path;
          // Set in form
          this.formGroup.get('resumeUrl')?.setValue(path);
          this.uploadingResume = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Resume upload failed', err);
          this.uploadingResume = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  onContractSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadingContract = true;
      this.uploadService.uploadFile(file, 'contracts').subscribe({
        next: (path) => {
          this.contractPath = path;
          // Set in form
          this.formGroup.get('contractUrl')?.setValue(path);
          this.uploadingContract = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Contract upload failed', err);
          this.uploadingContract = false;
          this.cdr.markForCheck();
        }
      });
    }
  }
}
