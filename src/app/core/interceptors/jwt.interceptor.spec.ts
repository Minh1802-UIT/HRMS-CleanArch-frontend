import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';
import { of, BehaviorSubject } from 'rxjs';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getToken', 'refreshAccessToken', 'logout'
    ], {
      isRefreshInProgress: false,
      onRefreshComplete: new BehaviorSubject<string | null>(null).asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should add Authorization header when token exists', () => {
    authServiceSpy.getToken.and.returnValue('my-token');

    http.get('/api/employees').subscribe();

    const req = httpMock.expectOne('/api/employees');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should NOT add header when no token', () => {
    authServiceSpy.getToken.and.returnValue(null);

    http.get('/api/employees').subscribe();

    const req = httpMock.expectOne('/api/employees');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should NOT add header for /auth/login requests', () => {
    authServiceSpy.getToken.and.returnValue('my-token');

    http.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should NOT add header for /auth/register requests', () => {
    authServiceSpy.getToken.and.returnValue('my-token');

    http.post('/api/auth/register', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should NOT add header for /auth/refresh-token requests', () => {
    authServiceSpy.getToken.and.returnValue('my-token');

    http.post('/api/auth/refresh-token', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh-token');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should attempt refresh on 401 and retry with new token', () => {
    authServiceSpy.getToken.and.returnValue('old-token');
    authServiceSpy.refreshAccessToken.and.returnValue(of('new-token'));

    http.get('/api/employees').subscribe(res => {
      expect(res).toEqual({ data: 'ok' });
    });

    // First request returns 401
    const req1 = httpMock.expectOne('/api/employees');
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Interceptor refreshes token and retries — second request should have new token
    const req2 = httpMock.expectOne('/api/employees');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
    req2.flush({ data: 'ok' });
  });

  it('should propagate error when 401 on auth endpoint', () => {
    authServiceSpy.getToken.and.returnValue(null);
    let errorCaught = false;

    http.post('/api/auth/login', {}).subscribe({
      error: () => { errorCaught = true; }
    });

    httpMock.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(errorCaught).toBeTrue();
  });

  it('should propagate non-401 errors without refreshing', () => {
    authServiceSpy.getToken.and.returnValue('token');
    let errorStatus = 0;

    http.get('/api/employees').subscribe({
      error: (err) => { errorStatus = err.status; }
    });

    httpMock.expectOne('/api/employees').flush({}, { status: 500, statusText: 'Server Error' });
    expect(errorStatus).toBe(500);
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
  });
});
