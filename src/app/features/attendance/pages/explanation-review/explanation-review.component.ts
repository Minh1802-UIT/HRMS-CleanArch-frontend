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
          this.toast.showError('Lỗi', err?.error?.message || 'Không thể tải danh sách giải trình.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  approve(item: AttendanceExplanation): void {
    this.confirm.confirm({
      title: 'Phê duyệt giải trình',
      message: `Bạn có chắc muốn phê duyệt giải trình của ${item.employeeName ?? item.employeeId} cho ngày ${new Date(item.workDate).toLocaleDateString('vi-VN')}? Hệ thống sẽ tự động cập nhật ngày đó thành đủ công (8 giờ).`,
      confirmLabel: 'Phê duyệt',
      cancelLabel: 'Hủy',
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
            this.toast.showSuccess('Đã phê duyệt', `Giải trình của ${item.employeeName ?? item.employeeId} đã được phê duyệt.`);
            this.processingId = null;
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.toast.showError('Lỗi', err?.error?.message || 'Phê duyệt thất bại.');
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
          this.toast.showSuccess('Đã từ chối', `Giải trình của ${item.employeeName ?? item.employeeId} đã bị từ chối.`);
          this.processingId = null;
          this.closeRejectModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toast.showError('Lỗi', err?.error?.message || 'Từ chối thất bại.');
          this.processingId = null;
          this.cdr.markForCheck();
        }
      });
  }
}
