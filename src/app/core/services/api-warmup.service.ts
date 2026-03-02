import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { LoggerService } from './logger.service';

/**
 * Sends a lightweight ping to the backend's /health endpoint as early
 * as possible so Render.com (free tier) wakes up immediately rather than
 * making the user wait for the cold-start penalty on the first real request.
 *
 * Call warmup() once from AppComponent constructor — fire-and-forget.
 */
@Injectable({ providedIn: 'root' })
export class ApiWarmupService {
  /** Strip the '/api' suffix to get the root base URL for /health */
  private readonly healthUrl = environment.apiUrl.replace(/\/api$/, '') + '/health';

  constructor(private http: HttpClient, private logger: LoggerService) {}

  warmup(): void {
    this.logger.debug('ApiWarmupService: sending warmup ping to', this.healthUrl);
    this.http
      .get(this.healthUrl, { responseType: 'text' })
      .subscribe({
        next: () => this.logger.debug('ApiWarmupService: backend is warm'),
        error: (err) => this.logger.warn('ApiWarmupService: warmup ping failed (non-critical)', err),
      });
  }
}
