import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MyAttendanceService } from '@features/attendance/services/my-attendance.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

interface CheckInPoint {
  id: string;
  name: string;
  address?: string;
  distance: string | null;
  lat?: number;
  lng?: number;
}

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-checkin-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './checkin-page.component.html',
  styleUrl: './checkin-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckinPageComponent implements OnInit, OnDestroy {
  currentStep: Step = 1;
  currentTime = new Date();
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  // Step 1: Location
  checkInPoints: CheckInPoint[] = [
    { id: 'hq', name: 'HQ Office', address: 'Main Headquarters', distance: null },
    { id: 'branch1', name: 'Branch Office 1', address: 'Branch 1 location', distance: null },
    { id: 'remote', name: 'Remote / Home', address: 'Work from home', distance: null },
  ];
  selectedPointId: string | null = null;
  userLat: number | null = null;
  userLng: number | null = null;
  locationError: string | null = null;
  locationLoading = false;

  // Step 2: Face capture (optional placeholder)
  faceCaptured = false;
  skipFace = false;

  // Processing
  loading = false;
  submitted = false;
  resultMessage = '';
  resultType: 'success' | 'error' = 'success';
  checkType: 'CheckIn' | 'CheckOut' = 'CheckIn';

  constructor(
    private myAttendanceService: MyAttendanceService,
    private toast: ToastService,
    private logger: LoggerService,
    readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    }, 1000);
    this.detectLocation();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  detectLocation(): void {
    this.locationLoading = true;
    this.locationError = null;
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      this.locationLoading = false;
      this.cdr.markForCheck();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.locationLoading = false;
        this.calculateDistances();
        this.cdr.markForCheck();
      },
      (err) => {
        this.locationError = 'Could not detect your location. Please allow location access.';
        this.locationLoading = false;
        this.cdr.markForCheck();
      }
    );
  }

  calculateDistances(): void {
    // Mark all as N/A without real GPS coords for check-in points
    // In production, compare against point's lat/lng with Haversine formula
    this.checkInPoints = this.checkInPoints.map((p) => ({ ...p, distance: 'N/A' }));
  }

  selectPoint(id: string): void {
    this.selectedPointId = id;
    this.cdr.markForCheck();
  }

  goToStep2(): void {
    if (!this.selectedPointId) return;
    this.currentStep = 2;
    this.cdr.markForCheck();
  }

  skipFaceCapture(): void {
    this.skipFace = true;
    this.currentStep = 3;
    this.cdr.markForCheck();
  }

  captureAndContinue(): void {
    // Placeholder: in production, open camera
    this.faceCaptured = true;
    this.currentStep = 3;
    this.cdr.markForCheck();
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as Step;
      this.cdr.markForCheck();
    }
  }

  submitCheckIn(): void {
    this.loading = true;
    const req = {
      type: this.checkType,
      deviceId: 'WebApp',
      latitude: this.userLat ?? undefined,
      longitude: this.userLng ?? undefined,
    };
    const action$ =
      this.checkType === 'CheckIn'
        ? this.myAttendanceService.checkIn(req)
        : this.myAttendanceService.checkOut(req);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (msg) => {
        this.loading = false;
        this.submitted = true;
        this.resultMessage = msg;
        this.resultType = 'success';
        this.toast.showSuccess(
          this.checkType === 'CheckIn' ? 'Checked In' : 'Checked Out',
          msg
        );
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loading = false;
        this.submitted = true;
        this.resultMessage = err.message;
        this.resultType = 'error';
        this.toast.showError('Failed', err.message);
        this.cdr.markForCheck();
      },
    });
  }

  reset(): void {
    this.currentStep = 1;
    this.submitted = false;
    this.resultMessage = '';
    this.selectedPointId = null;
    this.faceCaptured = false;
    this.skipFace = false;
    this.cdr.markForCheck();
  }

  getSelectedPoint(): CheckInPoint | undefined {
    return this.checkInPoints.find((p) => p.id === this.selectedPointId);
  }
}
