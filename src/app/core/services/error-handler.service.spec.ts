import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';
import { MessageService } from 'primeng/api';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);
    messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    });

    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // handleHttpError
  // --------------------------------------------------
  describe('handleHttpError', () => {
    it('should log and show toast for connection error (status 0)', () => {
      const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
      service.handleHttpError(error, 'test');

      expect(loggerSpy.error).toHaveBeenCalled();
      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Connection Error' })
      );
    });

    it('should show validation error for 400 with errors array', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { errors: ['Field A is required', 'Field B is invalid'] }
      });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          summary: 'Validation Error',
          severity: 'warn'
        })
      );
    });

    it('should show validation error for 400 with message', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { message: 'Bad input!' }
      });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Bad input!'
        })
      );
    });

    it('should show unauthorized for 401', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Unauthorized' })
      );
    });

    it('should show forbidden for 403', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Forbidden' })
      );
    });

    it('should show not found for 404', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Not Found' })
      );
    });

    it('should show server error for 500', () => {
      const error = new HttpErrorResponse({
        status: 500,
        error: { message: 'Internal failure' }
      });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Server Error' })
      );
    });

    it('should show service unavailable for 503', () => {
      const error = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Service Unavailable' })
      );
    });

    it('should show generic error for unknown status', () => {
      const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ summary: 'Error 418' })
      );
    });

    it('should handle client-side ErrorEvent', () => {
      const errorEvent = new ErrorEvent('err', { message: 'Lost connection' });
      const error = new HttpErrorResponse({ error: errorEvent, status: 0 });
      service.handleHttpError(error);

      expect(messageServiceSpy.add).toHaveBeenCalled();
    });

    it('should include context in log when provided', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      service.handleHttpError(error, 'EmployeeList');

      expect(loggerSpy.error).toHaveBeenCalledWith(
        jasmine.stringContaining('EmployeeList'),
        jasmine.anything()
      );
    });
  });

  // --------------------------------------------------
  // handleError (generic)
  // --------------------------------------------------
  describe('handleError', () => {
    it('should log and show toast for general errors', () => {
      service.handleError(new Error('Something broke'), 'Dashboard');

      expect(loggerSpy.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Dashboard'),
        jasmine.anything()
      );
      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          detail: 'Something broke'
        })
      );
    });

    it('should handle null/undefined errors gracefully', () => {
      service.handleError(null);

      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'An unexpected error occurred'
        })
      );
    });
  });

  // --------------------------------------------------
  // Toast helpers
  // --------------------------------------------------
  describe('toast helpers', () => {
    it('showSuccess should call messageService.add', () => {
      service.showSuccess('OK', 'Done');
      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success', summary: 'OK', detail: 'Done' })
      );
    });

    it('showWarning should call messageService.add', () => {
      service.showWarning('Watch out', 'Careful');
      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'warn', summary: 'Watch out' })
      );
    });

    it('showInfo should call messageService.add', () => {
      service.showInfo('FYI', 'Note');
      expect(messageServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'info', summary: 'FYI' })
      );
    });
  });
});
