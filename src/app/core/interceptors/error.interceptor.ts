import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoggerService } from '@core/services/logger.service';

/**
 * Error interceptor for non-401 HTTP errors.
 *
 * 401 handling is fully managed by jwtInterceptor (refresh + retry).
 * This interceptor handles other error codes (403, 500, etc.) and logs them.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 0:
          logger.error('[HTTP] Network error or server unreachable', { url: req.url });
          break;
        case 403:
          logger.warn('[HTTP] Forbidden', { url: req.url });
          break;
        case 404:
          logger.warn('[HTTP] Not found', { url: req.url });
          break;
        case 500:
        case 502:
        case 503:
          logger.error('[HTTP] Server error', { status: error.status, url: req.url });
          break;
      }

      return throwError(() => error);
    })
  );
};
