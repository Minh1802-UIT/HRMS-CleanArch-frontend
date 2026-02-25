import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

describe('roleGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  const mockState = { url: '/admin' } as RouterStateSnapshot;

  function makeRoute(roles?: string[]): ActivatedRouteSnapshot {
    return { data: { roles } } as Partial<ActivatedRouteSnapshot> as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn'], {
      currentUserValue: { id: '1', username: 'admin', roles: ['Admin'] }
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['showError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy }
      ]
    });
  });

  it('should redirect to /login when not logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute(['Admin']), mockState));

    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should allow access when no roles are required', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute(), mockState));

    expect(result).toBeTrue();
  });

  it('should allow access when user has required role', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute(['Admin', 'Manager']), mockState));

    expect(result).toBeTrue();
  });

  it('should deny access and redirect to /dashboard when user lacks role', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);
    // User has Admin, but route requires HR
    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute(['HR']), mockState));

    expect(result).toBeFalse();
    expect(toastSpy.showError).toHaveBeenCalledWith('Access Denied', jasmine.any(String));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should deny access when user has no roles at all', () => {
    (Object.getOwnPropertyDescriptor(authServiceSpy, 'currentUserValue')?.get as jasmine.Spy).and.returnValue(
      { id: '1', username: 'user', roles: [] }
    );
    authServiceSpy.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute(['Admin']), mockState));

    expect(result).toBeFalse();
  });
});
