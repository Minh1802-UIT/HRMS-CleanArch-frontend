import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExplanationService, AttendanceExplanation } from '@features/attendance/services/explanation.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { ConfirmDialogService } from '@core/services/confirm-dialog.service';

@Component({
  selector: 'app-explanation-review',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './explanation-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplanationReviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  items: AttendanceExplanation[] = [];
  processingId: string | null = null;

  // Reject modal state
  showRejectModal = false;
  rejectNote = '';
  selectedItem: AttendanceExplanation | null = null;

  constructor(
    private service: ExplanationService,
    private toast: ToastService,
    private logger: LoggerService,
    private confirm: ConfirmDialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.service.getPending()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.items = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('ExplanationReview: load failed', err);
          this.toast.showError('Error', err?.error?.message || 'Failed to load explanation list.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  approve(item: AttendanceExplanation): void {
    this.confirm.confirm({
      title: item.type === 'CompensatoryTime' ? 'Approve Compensatory Time' : 'Approve Explanation',
      message: item.type === 'CompensatoryTime'
        ? `Approve compensatory time request for ${item.employeeName ?? item.employeeId} on ${new Date(item.workDate).toLocaleDateString('en-GB')}? System will add ${item.requestedCompHours}h (capped at 8h standard) to that day.`
        : `Are you sure you want to approve the explanation for ${item.employeeName ?? item.employeeId} on ${new Date(item.workDate).toLocaleDateString('en-GB')}? The system will automatically update that day to full attendance (8 hours).`,
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      type: 'success',
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(confirmed => {
      if (!confirmed) return;
      this.processingId = item.id;
      this.cdr.markForCheck();
      this.service.review(item.id, 'Approve')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.items = this.items.filter(i => i.id !== item.id);
            this.toast.showSuccess('Approved', `Explanation for ${item.employeeName ?? item.employeeId} has been approved.`);
            this.processingId = null;
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.toast.showError('Error', err?.error?.message || 'Approval failed.');
            this.processingId = null;
            this.cdr.markForCheck();
          }
        });
    });
  }

  openRejectModal(item: AttendanceExplanation): void {
    this.selectedItem = item;
    this.rejectNote = '';
    this.showRejectModal = true;
    this.cdr.markForCheck();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedItem = null;
    this.rejectNote = '';
    this.cdr.markForCheck();
  }

  confirmReject(): void {
    if (!this.selectedItem || !this.rejectNote.trim()) return;
    const item = this.selectedItem;
    this.processingId = item.id;
    this.cdr.markForCheck();

    this.service.review(item.id, 'Reject', this.rejectNote.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.items = this.items.filter(i => i.id !== item.id);
          this.toast.showSuccess('Rejected', `Explanation for ${item.employeeName ?? item.employeeId} has been rejected.`);
          this.processingId = null;
          this.closeRejectModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.message || 'Rejection failed.');
          this.processingId = null;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Type helpers ─────────────────────────────────────────────────────────

  getTypeLabel(type: string): string {
    return type === 'CompensatoryTime' ? 'Bù Giờ' : 'Quên Chấm Công';
  }

  getTypeIcon(type: string): string {
    return type === 'CompensatoryTime' ? 'update' : 'fingerprint';
  }

  getTypeClass(type: string): string {
    return type === 'CompensatoryTime'
      ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
      : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
  }
}
