import { ErrorHandler, Injectable, Injector, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Global Angular ErrorHandler — catches all unhandled exceptions including:
 * - Template errors
 * - Unhandled promise rejections bubbled through zones
 * - Runtime errors in components/services not caught by catchError
 *
 * Registered in app.config.ts via:
 *   { provide: ErrorHandler, useClass: GlobalErrorHandler }
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Use Injector to avoid circular dependency (ErrorHandler is initialized early)
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const logger = this.injector.get(LoggerService);
    const errorHandler = this.injector.get(ErrorHandlerService);

    if (error instanceof HttpErrorResponse) {
      // HTTP errors should be handled by the interceptor normally,
      // but if they reach here, pass to ErrorHandlerService
      errorHandler.handleHttpError(error, 'GlobalErrorHandler');
    } else {
      // Runtime / template / unexpected errors
      logger.error('Unhandled application error', error);
      errorHandler.handleError(error, 'GlobalErrorHandler');
    }

    // Re-log in development to preserve stack traces in DevTools
    if (isDevMode()) {
      console.error('GlobalErrorHandler caught:', error);
    }
  }
}
