import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);
    toastSpy = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showWarn', 'showInfo']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: ToastService, useValue: toastSpy }
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
      expect(toastSpy.showError).toHaveBeenCalledWith('Connection Error', jasmine.any(String));
    });

    it('should show validation error for 400 with errors array', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { errors: ['Field A is required', 'Field B is invalid'] }
      });
      service.handleHttpError(error);

      expect(toastSpy.showWarn).toHaveBeenCalledWith('Validation Error', jasmine.any(String));
    });

    it('should show validation error for 400 with message', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { message: 'Bad input!' }
      });
      service.handleHttpError(error);

      expect(toastSpy.showWarn).toHaveBeenCalledWith(jasmine.any(String), 'Bad input!');
    });

    it('should show unauthorized for 401', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Unauthorized', jasmine.any(String));
    });

    it('should show forbidden for 403', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Forbidden', jasmine.any(String));
    });

    it('should show not found for 404', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Not Found', jasmine.any(String));
    });

    it('should show server error for 500', () => {
      const error = new HttpErrorResponse({
        status: 500,
        error: { message: 'Internal failure' }
      });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Server Error', jasmine.any(String));
    });

    it('should show service unavailable for 503', () => {
      const error = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Service Unavailable', jasmine.any(String));
    });

    it('should show generic error for unknown status', () => {
      const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalledWith('Error 418', jasmine.any(String));
    });

    it('should handle client-side ErrorEvent', () => {
      const errorEvent = new ErrorEvent('err', { message: 'Lost connection' });
      const error = new HttpErrorResponse({ error: errorEvent, status: 0 });
      service.handleHttpError(error);

      expect(toastSpy.showError).toHaveBeenCalled();
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
      expect(toastSpy.showError).toHaveBeenCalledWith('Error', 'Something broke');
    });

    it('should handle null/undefined errors gracefully', () => {
      service.handleError(null);

      expect(toastSpy.showError).toHaveBeenCalledWith('Error', 'An unexpected error occurred');
    });
  });

  // --------------------------------------------------
  // Toast helpers
  // --------------------------------------------------
  describe('toast helpers', () => {
    it('showSuccess should call toast.showSuccess', () => {
      service.showSuccess('OK', 'Done');
      expect(toastSpy.showSuccess).toHaveBeenCalledWith('OK', 'Done');
    });

    it('showWarning should call toast.showWarn', () => {
      service.showWarning('Watch out', 'Careful');
      expect(toastSpy.showWarn).toHaveBeenCalledWith('Watch out', 'Careful');
    });

    it('showInfo should call toast.showInfo', () => {
      service.showInfo('FYI', 'Note');
      expect(toastSpy.showInfo).toHaveBeenCalledWith('FYI', 'Note');
    });
  });
});
