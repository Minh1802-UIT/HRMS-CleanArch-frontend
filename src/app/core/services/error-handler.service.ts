import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';
import { MessageService } from 'primeng/api';

export interface ErrorMessage {
  title: string;
  detail: string;
  severity: 'error' | 'warn' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(
    private logger: LoggerService,
    private messageService: MessageService
  ) {}

  /**
   * Handle HTTP errors and show user-friendly messages
   */
  handleHttpError(error: HttpErrorResponse, context?: string): void {
    const errorMessage = this.parseHttpError(error);
    
    // Log the error
    this.logger.error(
      `HTTP Error ${context ? `in ${context}` : ''}: ${error.status}`,
      error
    );

    // Show toast notification to user
    this.showErrorToast(errorMessage);
  }

  /**
   * Handle general application errors
   */
  handleError(error: Error | any, context?: string): void {
    const message = error?.message || 'An unexpected error occurred';
    
    this.logger.error(
      `Application Error ${context ? `in ${context}` : ''}: ${message}`,
      error
    );

    this.showErrorToast({
      title: 'Error',
      detail: message,
      severity: 'error'
    });
  }

  /**
   * Parse HTTP error responses into user-friendly messages
   */
  private parseHttpError(error: HttpErrorResponse): ErrorMessage {
    let title = 'Error';
    let detail = 'An unexpected error occurred. Please try again.';
    let severity: 'error' | 'warn' | 'info' = 'error';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      detail = `Network error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          title = 'Connection Error';
          detail = 'Unable to connect to the server. Please check your internet connection.';
          break;
        case 400:
          title = 'Validation Error';
          if (error.error?.errors && Array.isArray(error.error.errors)) {
            detail = error.error.errors.join('\n');
          } else {
            detail = error.error?.message || 'Invalid request. Please check your input.';
          }
          severity = 'warn';
          break;
        case 401:
          title = 'Unauthorized';
          detail = 'Your session has expired. Please log in again.';
          break;
        case 403:
          title = 'Forbidden';
          detail = 'You do not have permission to perform this action.';
          break;
        case 404:
          title = 'Not Found';
          detail = 'The requested resource was not found.';
          break;
        case 500:
          title = 'Server Error';
          detail = error.error?.message || 'Internal server error. Please try again later.';
          break;
        case 503:
          title = 'Service Unavailable';
          detail = 'The service is temporarily unavailable. Please try again later.';
          break;
        default:
          title = `Error ${error.status}`;
          detail = error.error?.message || error.statusText || detail;
      }
    }

    return { title, detail, severity };
  }

  /**
   * Show error toast notification
   */
  private showErrorToast(errorMessage: ErrorMessage): void {
    this.messageService.add({
      severity: errorMessage.severity,
      summary: errorMessage.title,
      detail: errorMessage.detail,
      life: 5000
    });
  }

  /**
   * Show success toast notification
   */
  showSuccess(title: string, message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: title,
      detail: message,
      life: 3000
    });
  }

  /**
   * Show warning toast notification
   */
  showWarning(title: string, message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: title,
      detail: message,
      life: 4000
    });
  }

  /**
   * Show info toast notification
   */
  showInfo(title: string, message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: title,
      detail: message,
      life: 3000
    });
  }
}
