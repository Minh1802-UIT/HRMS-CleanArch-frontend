import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

// --- Helpers ---

/** Build a minimal valid JWT with given payload (exp in seconds). */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

function futureExp(minutes = 30): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

function pastExp(minutes = 5): number {
  return Math.floor(Date.now() / 1000) - minutes * 60;
}

function storedUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    username: 'admin',
    email: 'admin@test.com',
    token: makeJwt({ exp: futureExp(), nameid: '1', unique_name: 'admin', email: 'admin@test.com', role: 'Admin' }),
    // refreshToken is NOT stored client-side — lives in httpOnly cookie
    roles: ['Admin'],
    ...overrides
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  const apiUrl = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    // Clear sessionStorage before each test (production uses sessionStorage, not localStorage)
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  // --------------------------------------------------
  // Initialization
  // --------------------------------------------------
  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user when sessionStorage is empty', () => {
      expect(service.currentUserValue).toBeNull();
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should initialize with stored user from sessionStorage', () => {
      const user = storedUser();
      sessionStorage.setItem('currentUser', JSON.stringify(user));

      // Re-create service to pick up sessionStorage
      TestBed.resetTestingModule();
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: routerSpy },
          { provide: LoggerService, useValue: loggerSpy }
        ]
      });
      const svc = TestBed.inject(AuthService);
      expect(svc.currentUserValue).toBeTruthy();
      expect(svc.currentUserValue!.username).toBe('admin');
      // cleanup
      TestBed.inject(HttpTestingController).verify();
    });

    it('should handle invalid JSON in sessionStorage gracefully', () => {
      sessionStorage.setItem('currentUser', 'not-valid-json');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: routerSpy },
          { provide: LoggerService, useValue: loggerSpy }
        ]
      });
      const svc = TestBed.inject(AuthService);
      expect(svc.currentUserValue).toBeNull();
      TestBed.inject(HttpTestingController).verify();
    });
  });

  // --------------------------------------------------
  // getToken / getRefreshToken
  // --------------------------------------------------
  describe('getToken / getRefreshToken', () => {
    it('should return null when no user', () => {
      expect(service.getToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should return token from current user', () => {
      const user = storedUser();
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      // Reinitialize to pick up sessionStorage
      TestBed.resetTestingModule();
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: routerSpy },
          { provide: LoggerService, useValue: loggerSpy }
        ]
      });
      const svc = TestBed.inject(AuthService);
      expect(svc.getToken()).toBe(user.token!);
      // getRefreshToken() always returns null — refresh token is in httpOnly cookie
      expect(svc.getRefreshToken()).toBeNull();
      TestBed.inject(HttpTestingController).verify();
    });
  });

  // --------------------------------------------------
  // register
  // --------------------------------------------------
  describe('register', () => {
    it('should POST to /auth/register', () => {
      const payload = { username: 'new', email: 'new@test.com', password: '123' };
      service.register(payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ ok: true });
    });
  });

  // --------------------------------------------------
  // login
  // --------------------------------------------------
  describe('login', () => {
    it('should store user and tokens on successful login', () => {
      const token = makeJwt({
        exp: futureExp(),
        nameid: '42',
        unique_name: 'john',
        email: 'john@test.com',
        role: 'Employee'
      });

      service.login({ username: 'john', password: 'pass' }).subscribe(data => {
        expect(data).toBeTruthy();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      req.flush({
        succeeded: true,
        message: 'OK',
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 3600,
          user: {
            id: '42',
            username: 'john',
            email: 'john@test.com',
            fullName: 'John Doe',
            roles: ['Employee'],
            isActive: true,
            mustChangePassword: false
          }
        }
      });

      // Verify state was updated
      expect(service.currentUserValue).toBeTruthy();
      expect(service.currentUserValue!.token).toBe(token);
      // refreshToken is NOT stored in user object — lives in httpOnly cookie
      expect(service.currentUserValue!.refreshToken).toBeUndefined();
      expect(service.currentUserValue!.roles).toEqual(['Employee']);
      expect(sessionStorage.getItem('currentUser')).toBeTruthy();
    });

    it('should decode roles from Microsoft ClaimTypes URI format', () => {
      const token = makeJwt({
        exp: futureExp(),
        nameid: '1',
        unique_name: 'admin',
        email: 'a@b.com',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Admin', 'Manager']
      });

      service.login({ username: 'admin', password: 'p' }).subscribe();
      httpMock.expectOne(`${apiUrl}/login`).flush({
        succeeded: true,
        message: '',
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 3600,
          user: {
            id: '1',
            username: 'admin',
            email: 'a@b.com',
            fullName: 'Admin User',
            roles: ['Admin', 'Manager'],
            isActive: true,
            mustChangePassword: false
          }
        }
      });

      expect(service.currentUserValue!.roles).toEqual(['Admin', 'Manager']);
    });
  });

  // --------------------------------------------------
  // logout
  // --------------------------------------------------
  describe('logout', () => {
    it('should clear state and navigate to /login', () => {
      // Seed a user first
      (service as any).currentUserSubject.next(storedUser());

      service.logout();

      // Flush the fire-and-forget logout POST
      httpMock.expectOne(`${apiUrl}/logout`).flush({});

      expect(service.currentUserValue).toBeNull();
      expect(service.user()).toBeNull();
      expect(sessionStorage.getItem('currentUser')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/login'],
        { queryParams: { reason: 'session_expired' } }
      );
    });

    it('should pass custom reason to navigate', () => {
      (service as any).currentUserSubject.next(storedUser());
      service.logout('manual');

      // Flush the fire-and-forget logout POST
      httpMock.expectOne(`${apiUrl}/logout`).flush({});

      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/login'],
        { queryParams: { reason: 'manual' } }
      );
    });
  });

  // --------------------------------------------------
  // isLoggedIn
  // --------------------------------------------------
  describe('isLoggedIn', () => {
    it('should return false when no user', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should return true when token has not expired', () => {
      const user = storedUser();
      (service as any).currentUserSubject.next(user);
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return true when token is expired — interceptor handles refresh', () => {
      // With httpOnly cookie pattern, isLoggedIn() returns true even on expired token.
      // The JWT interceptor handles the 401 and triggers /auth/refresh-token automatically.
      const user = storedUser({
        token: makeJwt({ exp: pastExp(), nameid: '1', unique_name: 'a' })
      });
      (service as any).currentUserSubject.next(user);
      // Should return true — defer to interceptor, not isLoggedIn()
      expect(service.isLoggedIn()).toBeTrue();
      expect(loggerSpy.warn).toHaveBeenCalledWith('Access token expired – interceptor will handle refresh on next request');
    });

    it('should return false when no user at all', () => {
      // No user → definitely not logged in
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should return true when token has no exp claim', () => {
      const user = storedUser({ token: makeJwt({ nameid: '1' }) });
      (service as any).currentUserSubject.next(user);
      expect(service.isLoggedIn()).toBeTrue();
    });
  });

  // --------------------------------------------------
  // isTokenExpiringSoon
  // --------------------------------------------------
  describe('isTokenExpiringSoon', () => {
    it('should return true when no user', () => {
      expect(service.isTokenExpiringSoon()).toBeTrue();
    });

    it('should return false when token expires far in future', () => {
      const user = storedUser({ token: makeJwt({ exp: futureExp(60) }) });
      (service as any).currentUserSubject.next(user);
      expect(service.isTokenExpiringSoon()).toBeFalse();
    });

    it('should return true when token expires within 2 minutes', () => {
      const user = storedUser({ token: makeJwt({ exp: futureExp(1) }) }); // 1 minute
      (service as any).currentUserSubject.next(user);
      expect(service.isTokenExpiringSoon()).toBeTrue();
    });
  });

  // --------------------------------------------------
  // refreshAccessToken
  // --------------------------------------------------
  describe('refreshAccessToken', () => {
    it('should call /auth/refresh-token and update stored user', () => {
      const user = storedUser();
      (service as any).currentUserSubject.next(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));

      const newToken = makeJwt({ exp: futureExp(), nameid: '1' });

      service.refreshAccessToken().subscribe(token => {
        expect(token).toBe(newToken);
      });

      const req = httpMock.expectOne(`${apiUrl}/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.accessToken).toBe(user.token);
      // refreshToken is sent automatically via httpOnly cookie (withCredentials: true)
      // NOT via request body — so body should NOT include refreshToken
      expect(req.request.body.refreshToken).toBeUndefined();

      req.flush({
        succeeded: true,
        message: '',
        data: { accessToken: newToken, refreshToken: 'new-rt-456' }
      });

      expect(service.currentUserValue!.token).toBe(newToken);
      // refreshToken lives in httpOnly cookie — NOT stored in user object
      expect(service.currentUserValue!.refreshToken).toBeUndefined();
    });

    it('should logout when no tokens available', () => {
      service.refreshAccessToken().subscribe({
        error: err => expect(err.message).toBe('No tokens available')
      });

      // Flush the fire-and-forget logout POST triggered by logout()
      httpMock.expectOne(`${apiUrl}/logout`).flush({});

      expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('should logout when refresh fails', () => {
      const user = storedUser();
      (service as any).currentUserSubject.next(user);

      service.refreshAccessToken().subscribe({
        error: () => { /* expected */ }
      });

      httpMock.expectOne(`${apiUrl}/refresh-token`).flush(
        { message: 'Invalid' },
        { status: 401, statusText: 'Unauthorized' }
      );

      // Flush the fire-and-forget logout POST triggered by logout()
      httpMock.expectOne(`${apiUrl}/logout`).flush({});

      expect(routerSpy.navigate).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // getAllUsers
  // --------------------------------------------------
  describe('getAllUsers', () => {
    it('should GET /auth/users with pagination params', () => {
      service.getAllUsers(2, 10, 'john').subscribe(result => {
        expect(result.items.length).toBe(1);
      });

      const req = httpMock.expectOne(r =>
        r.url === `${apiUrl}/users` &&
        r.params.get('PageNumber') === '2' &&
        r.params.get('PageSize') === '10' &&
        r.params.get('SearchTerm') === 'john'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        succeeded: true,
        message: '',
        data: { items: [{ id: '1', username: 'john' }], totalCount: 1, pageNumber: 2, pageSize: 10, totalPages: 1, hasNext: false, hasPrevious: true }
      });
    });
  });

  // --------------------------------------------------
  // updateUserRoles / getRoles
  // --------------------------------------------------
  describe('updateUserRoles', () => {
    it('should PUT /auth/roles/:userId', () => {
      service.updateUserRoles('u1', ['Admin', 'Manager']).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/roles/u1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ Roles: ['Admin', 'Manager'] });
      req.flush({ succeeded: true, data: null });
    });
  });

  describe('getRoles', () => {
    it('should GET /auth/roles', () => {
      service.getRoles().subscribe(roles => {
        expect(roles).toEqual(['Admin', 'Employee']);
      });
      httpMock.expectOne(`${apiUrl}/roles`).flush({
        succeeded: true, data: ['Admin', 'Employee']
      });
    });
  });
});
