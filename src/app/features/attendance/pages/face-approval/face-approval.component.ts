import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ToastService } from '@core/services/toast.service';
import { ApiResponse } from '@core/models/api-response';

interface FaceRecord {
  id: string;
  employeeId: string;
  photoThumbnail?: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

@Component({
  selector: 'app-face-approval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './face-approval.component.html',
  styleUrl: './face-approval.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaceApprovalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/attendance/face`;

  activeTab: 'pending' | 'all' = 'pending';
  pending: FaceRecord[] = [];
  allRecords: FaceRecord[] = [];
  loading = true;

  // Reject modal
  showRejectModal = false;
  rejectingId: string | null = null;
  rejectReason = '';

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPending();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPending(): void {
    this.http.get<ApiResponse<FaceRecord[]>>(`${this.apiUrl}/pending`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.pending = res.data ?? [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
  }

  loadAll(): void {
    this.http.get<ApiResponse<FaceRecord[]>>(`${this.apiUrl}/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allRecords = res.data ?? [];
          this.cdr.markForCheck();
        }
      });
  }

  approve(id: string): void {
    this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/approve`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.showSuccess('Approved', 'Face registration approved.');
          this.loadPending();
          this.loadAll();
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.devMessage || 'Failed to approve.');
        }
      });
  }

  openReject(id: string): void {
    this.rejectingId = id;
    this.rejectReason = '';
    this.showRejectModal = true;
    this.cdr.markForCheck();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectingId = null;
    this.cdr.markForCheck();
  }

  confirmReject(): void {
    if (!this.rejectingId) return;
    this.http.post<ApiResponse<any>>(`${this.apiUrl}/${this.rejectingId}/reject`, {
      reason: this.rejectReason || null
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess('Rejected', 'Registration rejected.');
        this.closeRejectModal();
        this.loadPending();
        this.loadAll();
      },
      error: (err) => {
        this.toast.showError('Error', err?.error?.devMessage || 'Failed to reject.');
      }
    });
  }

  deleteRecord(id: string): void {
    if (!confirm('Delete this face registration? Employee will need to re-register.')) return;
    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.showSuccess('Deleted', 'Registration deleted.');
          this.loadPending();
          this.loadAll();
        }
      });
  }

  formatDate(d: string): string {
    try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Approved': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'Rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  }
}
