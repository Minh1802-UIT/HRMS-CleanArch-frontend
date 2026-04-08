import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MyAttendanceService, OfficeLocation } from '@features/attendance/services/my-attendance.service';
import { ToastService } from '@core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';
import * as L from 'leaflet';

// Fix Leaflet default marker icon
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface OfficeForm {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isRemote: boolean;
  isActive: boolean;
}

interface WfhApproval {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  reason: string | null;
  approvedBy: string;
  isActive: boolean;
  createdAt: string;
}

interface WfhForm {
  employeeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

@Component({
  selector: 'app-office-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './office-management.component.html',
  styleUrl: './office-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficeManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/attendance`;

  // ── Tab ──
  activeTab: 'offices' | 'wfh' = 'offices';

  // ── Offices ──
  offices: OfficeLocation[] = [];
  officesLoading = true;
  showOfficeModal = false;
  editingOfficeId: string | null = null;
  officeForm: OfficeForm = this.emptyOfficeForm();
  savingOffice = false;

  // ── WFH ──
  wfhApprovals: WfhApproval[] = [];
  wfhLoading = true;
  showWfhModal = false;
  wfhForm: WfhForm = this.emptyWfhForm();
  savingWfh = false;

  constructor(
    private attendanceService: MyAttendanceService,
    private http: HttpClient,
    private toast: ToastService,
    readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOffices();
    this.loadWfhApprovals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  OFFICES
  // ═══════════════════════════════════════════════════════════════════════

  loadOffices(): void {
    this.officesLoading = true;
    this.attendanceService.getOffices().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.offices = list;
      this.officesLoading = false;
      this.cdr.markForCheck();
    });
  }

  openCreateOffice(): void {
    this.editingOfficeId = null;
    this.officeForm = this.emptyOfficeForm();
    this.showOfficeModal = true;
    this.cdr.markForCheck();
  }

  openEditOffice(o: OfficeLocation): void {
    this.editingOfficeId = o.id;
    this.officeForm = {
      name: o.name,
      address: o.address ?? '',
      latitude: o.latitude,
      longitude: o.longitude,
      radiusMeters: o.radiusMeters,
      isRemote: o.isRemote,
      isActive: o.isActive,
    };
    this.showOfficeModal = true;
    this.cdr.markForCheck();
  }

  closeOfficeModal(): void {
    this.showOfficeModal = false;
    this.cdr.markForCheck();
  }

  saveOffice(): void {
    if (!this.officeForm.name.trim()) return;
    this.savingOffice = true;

    const payload = { ...this.officeForm };
    const req$ = this.editingOfficeId
      ? this.http.put<ApiResponse<any>>(`${this.apiUrl}/offices/${this.editingOfficeId}`, payload)
      : this.http.post<ApiResponse<any>>(`${this.apiUrl}/offices`, payload);

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess('Office saved', this.editingOfficeId ? 'Updated successfully.' : 'Created successfully.');
        this.savingOffice = false;
        this.closeOfficeModal();
        this.loadOffices();
      },
      error: (err) => {
        this.toast.showError('Error', err?.error?.message || 'Failed to save office.');
        this.savingOffice = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteOffice(id: string): void {
    if (!confirm('Are you sure you want to delete this office?')) return;
    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/offices/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.showSuccess('Deleted', 'Office deleted.');
          this.loadOffices();
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.message || 'Failed to delete.');
          this.cdr.markForCheck();
        }
      });
  }

  private emptyOfficeForm(): OfficeForm {
    return { name: '', address: '', latitude: 10.7769, longitude: 106.7009, radiusMeters: 500, isRemote: false, isActive: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  WFH APPROVALS
  // ═══════════════════════════════════════════════════════════════════════

  loadWfhApprovals(): void {
    this.wfhLoading = true;
    this.http.get<ApiResponse<WfhApproval[]>>(`${this.apiUrl}/wfh-approvals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.wfhApprovals = res.data ?? [];
          this.wfhLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.wfhApprovals = [];
          this.wfhLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openCreateWfh(): void {
    this.wfhForm = this.emptyWfhForm();
    this.showWfhModal = true;
    this.cdr.markForCheck();
  }

  closeWfhModal(): void {
    this.showWfhModal = false;
    this.cdr.markForCheck();
  }

  saveWfh(): void {
    if (!this.wfhForm.employeeId.trim() || !this.wfhForm.fromDate || !this.wfhForm.toDate) return;
    this.savingWfh = true;

    this.http.post<ApiResponse<any>>(`${this.apiUrl}/wfh-approvals`, this.wfhForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.showSuccess('Approved', 'WFH approval created.');
          this.savingWfh = false;
          this.closeWfhModal();
          this.loadWfhApprovals();
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.message || 'Failed to create WFH approval.');
          this.savingWfh = false;
          this.cdr.markForCheck();
        }
      });
  }

  revokeWfh(id: string): void {
    if (!confirm('Revoke this WFH approval?')) return;
    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/wfh-approvals/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.showSuccess('Revoked', 'WFH approval revoked.');
          this.loadWfhApprovals();
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.message || 'Failed to revoke.');
          this.cdr.markForCheck();
        }
      });
  }

  private emptyWfhForm(): WfhForm {
    return { employeeId: '', fromDate: '', toDate: '', reason: '' };
  }

  formatDate(d: string): string {
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
  }
}
