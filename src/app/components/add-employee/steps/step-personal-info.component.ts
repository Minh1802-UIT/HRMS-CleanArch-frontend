import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';
import { FormSelectComponent } from '../../../shared/components/form-select/form-select.component';

/**
 * Step 1: Personal Information Component
 * 
 * Form for collecting employee personal details:
 * - Name (first, last)
 * - Email, Phone
 * - Date of Birth, Gender
 * - Identity Card/Passport
 */
import { UploadService } from '@features/employee/services/upload.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-step-personal-info',
  standalone: true,
  imports: [ReactiveFormsModule, FormInputComponent, FormSelectComponent],
  templateUrl: './step-personal-info.component.html',
  styleUrls: ['./step-personal-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepPersonalInfoComponent implements OnInit {
  @Input() formGroup!: FormGroup; 

  uploading = false;
  previewUrl: string | null = null;
  /** Set when file validation or upload fails — displayed near the file input. */
  uploadError: string | null = null;

  constructor(private uploadService: UploadService, private logger: LoggerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // If we're in edit mode, the parent form might already have an avatarUrl
    if (this.formGroup.parent) {
      const rootForm = this.formGroup.root as FormGroup;
      const existingUrl = rootForm.get('avatarUrl')?.value;
      if (existingUrl) {
        this.previewUrl = this.uploadService.getFileUrl(existingUrl);
      }
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploading = true;
      this.uploadError = null;
      this.uploadService.uploadFile(file, 'avatars').subscribe({
        next: (path) => {
          this.previewUrl = this.uploadService.getFileUrl(path);
          this.uploadError = null;

          // Update the avatarUrl in the root form
          if (this.formGroup.parent) {
            const rootForm = this.formGroup.root as FormGroup;
            rootForm.get('avatarUrl')?.setValue(path);
            rootForm.markAsDirty();
          }

          this.uploading = false;
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.logger.error('Upload failed', err);
          this.uploadError = err.message || 'Upload failed. Please try again.';
          this.uploading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  removePhoto() {
    this.previewUrl = null;
    if (this.formGroup.parent) {
      const rootForm = this.formGroup.root as FormGroup;
      rootForm.get('avatarUrl')?.setValue(null);
      rootForm.markAsDirty();
    }
  }
}
