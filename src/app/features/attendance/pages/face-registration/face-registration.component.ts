import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ToastService } from '@core/services/toast.service';
import { FaceDetectionService } from '@core/services/face-detection.service';
import { ApiResponse } from '@core/models/api-response';

interface FaceStatus {
  registered: boolean;
  id?: string;
  status?: string;
  photoThumbnail?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-face-registration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-registration.component.html',
  styleUrl: './face-registration.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaceRegistrationComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/attendance/face`;
  private cameraStream: MediaStream | null = null;

  // State
  statusLoading = true;
  faceStatus: FaceStatus = { registered: false };
  modelsLoading = false;
  modelsLoaded = false;
  cameraActive = false;
  cameraError: string | null = null;
  detecting = false;
  faceDetected = false;
  capturedPhoto: string | null = null;
  capturedEmbedding: number[] | null = null;
  submitting = false;

  // Detection guide
  detectionMessage = '';

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private faceService: FaceDetectionService,
    readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMyStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
  }

  // ════════════════ STATUS ════════════════

  loadMyStatus(): void {
    this.statusLoading = true;
    this.http.get<ApiResponse<FaceStatus>>(`${this.apiUrl}/my-status`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.faceStatus = res.data ?? { registered: false };
          this.statusLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.faceStatus = { registered: false };
          this.statusLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ════════════════ MODELS ════════════════

  async loadModelsAndStartCamera(): Promise<void> {
    this.modelsLoading = true;
    this.cdr.markForCheck();

    try {
      await this.faceService.loadModels();
      this.modelsLoaded = true;
      this.modelsLoading = false;
      this.cdr.markForCheck();
      await this.startCamera();
    } catch {
      this.modelsLoading = false;
      this.toast.showError('Error', 'Failed to load face detection models.');
      this.cdr.markForCheck();
    }
  }

  // ════════════════ CAMERA ════════════════

  async startCamera(): Promise<void> {
    this.cameraError = null;
    this.capturedPhoto = null;
    this.capturedEmbedding = null;
    this.faceDetected = false;
    this.cdr.markForCheck();

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.cameraActive = true;
      this.cdr.detectChanges();

      const video = this.videoEl?.nativeElement;
      if (video && this.cameraStream) {
        video.srcObject = this.cameraStream;
        video.onloadedmetadata = () => video.play().catch(() => {});
      }
    } catch (err) {
      this.cameraError = (err as DOMException).name === 'NotAllowedError'
        ? 'Camera access denied. Please allow in browser settings.'
        : 'Could not open camera.';
      this.cdr.markForCheck();
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    this.cameraActive = false;
  }

  // ════════════════ DETECT & CAPTURE ════════════════

  async detectAndCapture(): Promise<void> {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;

    this.detecting = true;
    this.detectionMessage = 'Detecting face… hold still';
    this.cdr.markForCheck();

    try {
      const embedding = await this.faceService.extractEmbedding(video);

      if (!embedding) {
        this.faceDetected = false;
        this.detectionMessage = '❌ No face detected. Ensure good lighting and face the camera.';
        this.detecting = false;
        this.cdr.markForCheck();
        return;
      }

      // Capture the photo
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);
      this.capturedEmbedding = this.faceService.embeddingToArray(embedding);
      this.faceDetected = true;
      this.detectionMessage = '✅ Face detected successfully!';
      this.stopCamera();
    } catch (err) {
      this.detectionMessage = '❌ Detection failed. Try again.';
      console.error('[FaceRegistration] Detection error:', err);
    }

    this.detecting = false;
    this.cdr.markForCheck();
  }

  retake(): void {
    this.capturedPhoto = null;
    this.capturedEmbedding = null;
    this.faceDetected = false;
    this.detectionMessage = '';
    this.startCamera();
  }

  // ════════════════ SUBMIT ════════════════

  submitRegistration(): void {
    if (!this.capturedEmbedding || !this.capturedPhoto) return;

    this.submitting = true;
    this.cdr.markForCheck();

    // Create a small thumbnail (80x80)
    const thumbnail = this.createThumbnail(this.capturedPhoto, 80);

    this.http.post<ApiResponse<any>>(`${this.apiUrl}/register`, {
      embedding: this.capturedEmbedding,
      photoThumbnail: thumbnail,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.toast.showSuccess('Registered', res.message || 'Face registered. Awaiting HR approval.');
        this.submitting = false;
        this.capturedPhoto = null;
        this.capturedEmbedding = null;
        this.loadMyStatus();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.showError('Error', err?.error?.devMessage || 'Failed to register face.');
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ════════════════ REVOKE ════════════════

  revokeRegistration(): void {
    if (!confirm('Bạn có chắc chắn muốn huỷ đăng ký khuôn mặt hiện tại? Bạn sẽ không thể check-in cho đến khi đăng ký mới được duyệt.')) return;

    this.statusLoading = true;
    this.cdr.markForCheck();

    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/my-registration`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.toast.showSuccess('Revoked', res.message || 'Face registration revoked.');
          this.loadMyStatus(); // reload status
        },
        error: (err) => {
          this.toast.showError('Error', err?.error?.message || 'Failed to revoke registration.');
          this.statusLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private createThumbnail(dataUrl: string, size: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    const img = new Image();
    img.src = dataUrl;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.7);
  }
}
