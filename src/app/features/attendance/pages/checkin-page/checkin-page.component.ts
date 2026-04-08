import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ApplicationRef,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { MyAttendanceService, TodayAttendanceStatus, OfficeLocation } from '@features/attendance/services/my-attendance.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

// Fix Leaflet default marker icon path (broken by webpack)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface CheckInPoint {
  id: string;
  name: string;
  address?: string;
  distance: string | null;
  lat?: number;
  lng?: number;
  radiusMeters: number;
  isRemote: boolean;
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
export class CheckinPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  currentStep: Step = 1;
  currentTime = new Date();
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  // Leaflet
  private map: L.Map | null = null;
  private userMarker: L.Marker | null = null;
  private mapInitialized = false;
  private isDestroyed = false;

  // Step 1: Location — loaded from API
  checkInPoints: CheckInPoint[] = [];
  officesLoading = true;
  selectedPointId: string | null = null;
  userLat: number | null = null;
  userLng: number | null = null;
  locationError: string | null = null;
  locationLoading = false;
  private geofenceCircles: L.Circle[] = [];

  // Step 2: Webcam selfie
  faceCaptured = false;
  skipFace = false;
  capturedPhoto: string | null = null;    // base64 data URI
  cameraStream: MediaStream | null = null;
  cameraLoading = false;
  cameraError: string | null = null;
  cameraActive = false;                   // true while <video> is live

  // Processing
  loading = false;
  submitted = false;
  resultMessage = '';
  resultType: 'success' | 'error' = 'success';
  checkType: 'CheckIn' | 'CheckOut' = 'CheckIn';

  // Today's attendance gating
  todayStatusLoading = true;
  checkedInToday = false;
  checkedOutToday = false;
  todayCheckInTime: string | null = null;
  todayCheckOutTime: string | null = null;

  constructor(
    private myAttendanceService: MyAttendanceService,
    private toast: ToastService,
    private logger: LoggerService,
    readonly cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
  ) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    }, 1000);
    this.detectLocation();
    this.loadTodayStatus();
    this.loadOfficeLocations();
  }

  private loadOfficeLocations(): void {
    this.officesLoading = true;
    this.myAttendanceService.getOffices().pipe(takeUntil(this.destroy$)).subscribe(offices => {
      this.checkInPoints = offices.map(o => ({
        id: o.id,
        name: o.name,
        address: o.address,
        lat: o.isRemote ? undefined : o.latitude,
        lng: o.isRemote ? undefined : o.longitude,
        radiusMeters: o.radiusMeters,
        isRemote: o.isRemote,
        distance: null,
      }));
      this.officesLoading = false;
      this.calculateDistances();
      this.drawGeofenceCircles();
      this.cdr.markForCheck();
    });
  }

  private drawGeofenceCircles(): void {
    if (!this.map) return;
    // Remove old circles
    this.geofenceCircles.forEach(c => c.remove());
    this.geofenceCircles = [];
    // Draw new ones for physical offices
    this.checkInPoints.filter(p => !p.isRemote && p.lat && p.lng).forEach(p => {
      const circle = L.circle([p.lat!, p.lng!], {
        radius: p.radiusMeters,
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(this.map!);
      circle.bindTooltip(p.name, { permanent: false, direction: 'top' });
      this.geofenceCircles.push(circle);
    });
  }

  private loadTodayStatus(): void {
    this.todayStatusLoading = true;
    this.myAttendanceService
      .getTodayStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: TodayAttendanceStatus) => {
        this.checkedInToday  = status.hasCheckedIn;
        this.checkedOutToday = status.hasCheckedOut;
        this.todayCheckInTime  = status.checkInTime;
        this.todayCheckOutTime = status.checkOutTime;
        this.todayStatusLoading = false;
        // Auto-select the correct action tab
        if (status.hasCheckedIn && !status.hasCheckedOut) {
          this.checkType = 'CheckOut';
        } else {
          this.checkType = 'CheckIn';
        }
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready; run outside Angular for performance
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.initMap(), 100);
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.remove();
    this.stopCamera();
  }

  private initMap(): void {
    if (this.mapInitialized || !this.mapContainer?.nativeElement) return;
    this.mapInitialized = true;

    const defaultLat = this.userLat ?? 10.7769;
    const defaultLng = this.userLng ?? 106.7009;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap tile layer (free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Â© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Add user marker if location already detected
    if (this.userLat && this.userLng) {
      this.placeUserMarker(this.userLat, this.userLng);
    }
  }

  private placeUserMarker(lat: number, lng: number): void {
    if (!this.map || this.isDestroyed) return;
    try {
      // Pulsing circle for user location
      const pulseIcon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 0 4px rgba(34,197,94,0.35)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      if (this.userMarker) {
        this.userMarker.setLatLng([lat, lng]);
      } else {
        this.userMarker = L.marker([lat, lng], { icon: pulseIcon })
          .addTo(this.map)
          .bindPopup('<strong>My Location</strong>')
          .openPopup();
      }

      this.map.setView([lat, lng], 15);
    } catch (e) {
      // Map or pane not ready — silently ignore
    }
  }

  detectLocation(): void {
    this.locationLoading = true;
    this.locationError = null;
    this.cdr.markForCheck();

    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      this.locationLoading = false;
      this.cdr.markForCheck();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (this.isDestroyed) return;
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.locationLoading = false;
        this.calculateDistances();
        // Update map inside Angular zone for CD
        this.ngZone.run(() => { this.cdr.markForCheck(); });
        // Update map outside Angular zone
        this.ngZone.runOutsideAngular(() => {
          if (this.isDestroyed) return;
          if (this.map) {
            this.placeUserMarker(this.userLat!, this.userLng!);
          } else {
            // Map not yet initialized, it will pick up coords in initMap
            setTimeout(() => { if (!this.isDestroyed) this.initMap(); }, 200);
          }
        });
      },
      () => {
        if (this.isDestroyed) return;
        this.locationError = 'Could not detect your location. Please allow location access.';
        this.locationLoading = false;
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  calculateDistances(): void {
    if (!this.userLat || !this.userLng) return;
    this.checkInPoints = this.checkInPoints.map((p) => {
      if (!p.lat || !p.lng) return { ...p, distance: 'N/A' };
      const d = this.haversine(this.userLat!, this.userLng!, p.lat, p.lng);
      return { ...p, distance: d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km` };
    });
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  selectPoint(id: string): void {
    this.selectedPointId = id;
    this.cdr.markForCheck();
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  async startCamera(): Promise<void> {
    this.cameraLoading = true;
    this.cameraError = null;
    this.capturedPhoto = null;
    this.cameraActive = false;
    this.cdr.markForCheck();

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      this.cameraLoading = false;
      this.cameraActive = true;
      // Force Angular to flush DOM so <video> becomes visible before we touch it
      this.cdr.detectChanges();

      const video = this.videoEl?.nativeElement;
      if (video && this.cameraStream) {
        video.srcObject = this.cameraStream;
        video.onloadedmetadata = () => video.play().catch(() => {});
      }
    } catch (err) {
      this.cameraLoading = false;
      this.cameraError =
        (err as DOMException).name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera in browser settings.'
          : 'Could not open camera. Try a different browser or device.';
      this.cdr.markForCheck();
    }
  }

  // ── Liveness Detection ──────────────────────────────────────────────────────
  livenessStatus: 'idle' | 'scanning' | 'pass' | 'fail' = 'idle';
  livenessMessage = '';
  private capturedFrames: ImageData[] = [];

  capturePhoto(): void {
    // Start multi-frame liveness scan
    this.livenessStatus = 'scanning';
    this.livenessMessage = 'Analyzing liveness… hold still & face camera';
    this.capturedFrames = [];
    this.cdr.markForCheck();

    // Capture 3 frames at 500ms intervals
    this.captureFrameSequence(3, 500).then(frames => {
      if (frames.length < 2) {
        this.finishCapture(false, 'Could not capture enough frames');
        return;
      }

      // 1. Brightness check on the last frame
      const lastFrame = frames[frames.length - 1];
      const avgBrightness = this.getAvgBrightness(lastFrame);
      if (avgBrightness < 40) {
        this.finishCapture(false, 'Image too dark — ensure proper lighting');
        return;
      }

      // 2. Motion check: compare first and last frames
      const motionScore = this.computeMotionScore(frames[0], frames[frames.length - 1]);

      // 3. Variance check: ensure frames aren't all identical (possible photo replay)
      if (motionScore < 2.0) {
        // Less than 2% pixel change → likely a static photo
        this.livenessStatus = 'fail';
        this.livenessMessage = '⚠ Low motion detected — this may be a static image. Proceeding anyway.';
        this.logger.warn('Liveness: low motion score', { motionScore, avgBrightness });
      } else {
        this.livenessStatus = 'pass';
        this.livenessMessage = '✓ Liveness check passed';
      }

      // Always capture the photo regardless (non-blocking)
      this.finalizeCapture();
    });
  }

  private async captureFrameSequence(count: number, intervalMs: number): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return frames;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frames;

    for (let i = 0; i < count; i++) {
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(ctx.getImageData(0, 0, w, h));
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    return frames;
  }

  private getAvgBrightness(frame: ImageData): number {
    const data = frame.data;
    let total = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      // Luminance formula
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return total / pixelCount;
  }

  private computeMotionScore(frame1: ImageData, frame2: ImageData): number {
    const d1 = frame1.data;
    const d2 = frame2.data;
    const len = Math.min(d1.length, d2.length);
    let diffPixels = 0;
    const threshold = 30; // per-channel diff threshold
    const pixelCount = len / 4;

    for (let i = 0; i < len; i += 4) {
      const rDiff = Math.abs(d1[i] - d2[i]);
      const gDiff = Math.abs(d1[i + 1] - d2[i + 1]);
      const bDiff = Math.abs(d1[i + 2] - d2[i + 2]);
      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffPixels++;
      }
    }
    return (diffPixels / pixelCount) * 100;
  }

  private finishCapture(success: boolean, message: string): void {
    this.livenessStatus = success ? 'pass' : 'fail';
    this.livenessMessage = message;
    this.finalizeCapture();
  }

  private finalizeCapture(): void {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);
    this.stopCamera();
    this.faceCaptured = true;
    this.cdr.markForCheck();
  }

  retakePhoto(): void {
    this.capturedPhoto = null;
    this.faceCaptured = false;
    this.startCamera();
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
    this.cameraActive = false;
  }

  // ───────────────────────────────────────────────────────────────────────────

  goToStep2(): void {
    if (!this.selectedPointId) return;
    this.currentStep = 2;
    this.cdr.markForCheck();
    // Start camera after view renders step 2
    setTimeout(() => this.startCamera(), 100);
  }

  skipFaceCapture(): void {
    this.stopCamera();
    this.skipFace = true;
    this.capturedPhoto = null;
    this.currentStep = 3;
    this.cdr.markForCheck();
  }

  captureAndContinue(): void {
    if (!this.capturedPhoto && this.cameraActive) {
      this.capturePhoto();
    }
    this.stopCamera();
    this.currentStep = 3;
    this.cdr.markForCheck();
  }

  goBack(): void {
    if (this.currentStep > 1) {
      // Leaving step 2 → stop camera
      if (this.currentStep === 2) this.stopCamera();
      this.currentStep = (this.currentStep - 1) as Step;
      // Re-invalidate map size when returning to step 1
      if (this.currentStep === 1) {
        setTimeout(() => this.map?.invalidateSize(), 150);
      }
      // Re-entering step 2 from step 3 → restart camera
      if (this.currentStep === 2) {
        setTimeout(() => this.startCamera(), 100);
      }
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
      photoBase64: this.capturedPhoto ?? undefined,
      checkInPointId: this.selectedPointId ?? undefined,
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
        // Refresh today's status so buttons re-lock on next action
        this.loadTodayStatus();
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
    this.stopCamera();
    this.currentStep = 1;
    this.submitted = false;
    this.resultMessage = '';
    this.selectedPointId = null;
    this.faceCaptured = false;
    this.skipFace = false;
    this.capturedPhoto = null;
    setTimeout(() => this.map?.invalidateSize(), 150);
    this.cdr.markForCheck();
  }

  getSelectedPoint(): CheckInPoint | undefined {
    return this.checkInPoints.find((p) => p.id === this.selectedPointId);
  }
}
