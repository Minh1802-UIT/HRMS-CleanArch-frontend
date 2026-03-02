import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { MyAttendanceService } from '@features/attendance/services/my-attendance.service';
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

  currentStep: Step = 1;
  currentTime = new Date();
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  // Leaflet
  private map: L.Map | null = null;
  private userMarker: L.Marker | null = null;
  private mapInitialized = false;

  // Step 1: Location
  checkInPoints: CheckInPoint[] = [
    { id: 'hq',      name: 'HQ Office',      address: 'Main Headquarters',  distance: null },
    { id: 'branch1', name: 'Branch Office 1', address: 'Branch 1 location',  distance: null },
    { id: 'remote',  name: 'Remote / Home',  address: 'Work from home',      distance: null },
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
    readonly cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    }, 1000);
    this.detectLocation();
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready; run outside Angular for performance
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.initMap(), 100);
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.remove();
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
    if (!this.map) return;

    // Pulsing circle for user location
    const pulseIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#22c55e;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(34,197,94,0.35);
      "></div>`,
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
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.locationLoading = false;
        this.calculateDistances();
        // Update map inside Angular zone for CD
        this.ngZone.run(() => { this.cdr.markForCheck(); });
        // Update map outside Angular zone
        this.ngZone.runOutsideAngular(() => {
          if (this.map) {
            this.placeUserMarker(this.userLat!, this.userLng!);
          } else {
            // Map not yet initialized, it will pick up coords in initMap
            setTimeout(() => this.initMap(), 200);
          }
        });
      },
      () => {
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
    this.faceCaptured = true;
    this.currentStep = 3;
    this.cdr.markForCheck();
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as Step;
      // Re-invalidate map size when returning to step 1
      if (this.currentStep === 1) {
        setTimeout(() => this.map?.invalidateSize(), 150);
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
    setTimeout(() => this.map?.invalidateSize(), 150);
    this.cdr.markForCheck();
  }

  getSelectedPoint(): CheckInPoint | undefined {
    return this.checkInPoints.find((p) => p.id === this.selectedPointId);
  }
}
