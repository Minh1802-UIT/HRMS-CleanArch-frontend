import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '@core/services/auth.service';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  it('should allow access when user is logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeTrue();
  });

  it('should redirect to /login when user is not logged in', () => {
    authServiceSpy.isLoggedIn.and.returnValue(false);
    const urlTree = {} as UrlTree;
    routerSpy.createUrlTree.and.returnValue(urlTree);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBe(urlTree);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
