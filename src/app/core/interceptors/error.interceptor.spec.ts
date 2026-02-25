import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@core/services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should let successful requests pass through', () => {
    http.get('/api/test').subscribe(res => {
      expect(res).toEqual({ ok: true });
    });
    httpMock.expectOne('/api/test').flush({ ok: true });
  });

  it('should log network error (status 0) and re-throw', () => {
    spyOn(console, 'error');
    let caught = false;

    http.get('/api/test').subscribe({
      error: () => { caught = true; }
    });

    httpMock.expectOne('/api/test').error(new ProgressEvent('error'), { status: 0 });
    expect(caught).toBeTrue();
    expect(console.error).toHaveBeenCalled();
  });

  it('should log 403 forbidden and re-throw', () => {
    spyOn(console, 'warn');
    let errorStatus = 0;

    http.get('/api/admin').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/admin').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log 404 not found and re-throw', () => {
    spyOn(console, 'warn');
    let errorStatus = 0;

    http.get('/api/missing').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/missing').flush({}, { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log 500 server error and re-throw', () => {
    spyOn(console, 'error');
    let errorStatus = 0;

    http.get('/api/test').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/test').flush({}, { status: 500, statusText: 'Internal Server Error' });
    expect(errorStatus).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });

  it('should log 502 server error and re-throw', () => {
    spyOn(console, 'error');
    let errorStatus = 0;

    http.get('/api/test').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/test').flush({}, { status: 502, statusText: 'Bad Gateway' });
    expect(errorStatus).toBe(502);
    expect(console.error).toHaveBeenCalled();
  });

  it('should re-throw unhandled error status codes', () => {
    let errorStatus = 0;

    http.get('/api/test').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/test').flush({}, { status: 422, statusText: 'Unprocessable' });
    expect(errorStatus).toBe(422);
  });

  it('should NOT call authService.logout on any error', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});
