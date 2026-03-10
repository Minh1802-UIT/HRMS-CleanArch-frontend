import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Employee, EmployeeService } from '@features/employee/services/employee.service';
import { UploadService } from '@features/employee/services/upload.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-employee-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-documents.html',
  styleUrl: './employee-documents.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDocumentsComponent {
  @Input({ required: true }) employee!: Employee;
  @Output() documentUploaded = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  isUploadingDoc = false;

  constructor(
    private uploadService: UploadService,
    private empService: EmployeeService,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) { }

  onDocSelected(event: Event, type: 'resume' | 'contract') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.employee) {
      const folder = type === 'resume' ? 'resumes' : 'contracts';
      const validationError = this.uploadService.validateFile(file, folder);
      if (validationError) {
        this.toastService.showError('Invalid File', validationError);
        (event.target as HTMLInputElement).value = '';
        return;
      }
      this.isUploadingDoc = true;
      this.cdr.markForCheck();

      this.uploadService.uploadFile(file, folder).pipe(takeUntil(this.destroy$)).subscribe({
        next: (path: string) => {
          const updatePayload: Partial<Employee> = {
            id: this.employee.id,
            version: this.employee.version,
            fullName: this.employee.fullName,
            email: this.employee.email,
            jobDetails: {
              ...this.employee.jobDetails,
              resumeUrl: type === 'resume' ? path : this.employee.jobDetails?.resumeUrl,
              contractUrl: type === 'contract' ? path : this.employee.jobDetails?.contractUrl
            } as Employee['jobDetails']
          };

          this.empService.updateEmployee(this.employee.id, updatePayload).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.documentUploaded.emit();
              this.toastService.showSuccess('Uploaded', `${type === 'resume' ? 'Resume' : 'Contract'} updated successfully`);
              this.isUploadingDoc = false;
              this.cdr.markForCheck();
            },
            error: (err: any) => {
              this.logger.error('Update employee after upload failed', err);
              this.toastService.showError('Update Failed', 'File uploaded but could not update employee record');
              this.isUploadingDoc = false;
              this.cdr.markForCheck();
            }
          });
        },
        error: (err: any) => {
          this.logger.error('File upload failed', err);
          this.toastService.showError('Upload Failed', 'Failed to upload document');
          this.isUploadingDoc = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  getDocName(path: string | undefined): string {
    if (!path) return 'Not Uploaded';
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  downloadDoc(path: string | undefined) {
    if (!path) return;
    const safeUrl = this.uploadService.getFileUrl(path);
    if (!safeUrl) {
      this.toastService.showError('Invalid URL', 'Document URL is not from a trusted source.');
      return;
    }
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
