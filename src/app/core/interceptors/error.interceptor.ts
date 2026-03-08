import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';

/**
 * Error interceptor for non-401 HTTP errors.
 *
 * 401 handling is fully managed by jwtInterceptor (refresh + retry).
 * This interceptor handles other error codes (403, 500, etc.), logs them and shows user feedback.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let userMessage = '';
      let showToast = false;

      switch (error.status) {
        case 0:
          logger.error('[HTTP] Network error or server unreachable', { url: req.url });
          userMessage = 'Unable to connect to server. Please check your internet connection.';
          showToast = true;
          break;
        case 403:
          logger.warn('[HTTP] Forbidden', { url: req.url });
          userMessage = 'You do not have permission to perform this action.';
          showToast = true;
          break;
        case 404:
          logger.warn('[HTTP] Not found', { url: req.url });
          userMessage = 'The requested resource was not found.';
          showToast = true;
          break;
        case 500:
        case 502:
        case 503:
          logger.error('[HTTP] Server error', { status: error.status, url: req.url });
          userMessage = 'Server error occurred. Please try again later.';
          showToast = true;
          break;
        case 400:
          userMessage = error.error?.message || 'Invalid request. Please check your input.';
          showToast = true;
          break;
      }

      if (showToast && userMessage) {
        toast.showError('Error', userMessage);
      }

      return throwError(() => error);
    })
  );
};
