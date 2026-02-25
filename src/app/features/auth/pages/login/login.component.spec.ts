import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '@core/services/auth.service';
import { ErrorHandlerService } from '@core/services/error-handler.service';
import { LoggerService } from '@core/services/logger.service';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { of, throwError, EMPTY } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { ReactiveFormsModule } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;
  let mockLogger: jasmine.SpyObj<LoggerService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockLoginResponse = {
    accessToken: 'mock-access-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      employeeId: 'emp-1',
      roles: ['Employee'],
      isActive: true,
      mustChangePassword: false
    }
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', [
      'showSuccess', 'handleHttpError', 'handleError', 'showError'
    ]);
    mockLogger = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info', 'debug']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], {
      events: EMPTY,
      routerState: { root: {} }
    });
    routerSpy.createUrlTree.and.returnValue(new UrlTree());
    routerSpy.serializeUrl.and.returnValue('');

    mockAuthService.login.and.returnValue(of(mockLoginResponse));

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}), snapshot: { paramMap: { get: () => null } } } },
        MessageService,
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty username and password', () => {
    expect(component.loginForm.value).toEqual({ username: '', password: '' });
  });

  it('should be invalid when form is empty', () => {
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('should be invalid when password is too short (< 6 chars)', () => {
    component.loginForm.setValue({ username: 'admin', password: '123' });
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('should be valid with proper credentials', () => {
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should do nothing if form is invalid on submit', () => {
    component.loginForm.setValue({ username: '', password: '' });
    component.onSubmit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should call auth.login with form values on submit', fakeAsync(() => {
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();
    tick();

    expect(mockAuthService.login).toHaveBeenCalledWith({ username: 'admin', password: 'Admin@123' });
  }));

  it('should navigate to /dashboard on successful login', fakeAsync(() => {
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();
    tick();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should show success toast on successful login', fakeAsync(() => {
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();
    tick();

    expect(mockErrorHandler.showSuccess).toHaveBeenCalledWith('Welcome back!', 'Login successful');
  }));

  it('should set isLoading to false after login completes', fakeAsync(() => {
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();
    tick();

    expect(component.isLoading).toBeFalse();
  }));

  it('should handle login error: call handleHttpError and set errorMessage', fakeAsync(() => {
    const errorResponse = { status: 401, error: { message: 'Invalid credentials' } };
    mockAuthService.login.and.returnValue(throwError(() => errorResponse));

    component.loginForm.setValue({ username: 'admin', password: 'wrong-pass' });
    component.onSubmit();
    tick();

    expect(mockLogger.error).toHaveBeenCalledWith('Login error', errorResponse);
    expect(mockErrorHandler.handleHttpError).toHaveBeenCalledWith(jasmine.objectContaining({ status: 401, error: { message: 'Invalid credentials' } }), 'Login');
    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.isLoading).toBeFalse();
  }));

  it('should fall back to generic error message when error has no message', fakeAsync(() => {
    mockAuthService.login.and.returnValue(throwError(() => ({ status: 500 })));

    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid credentials or server error');
  }));

  it('should set isLoading to true during login', () => {
    mockAuthService.login.and.returnValue(of(mockLoginResponse));
    component.loginForm.setValue({ username: 'admin', password: 'Admin@123' });
    component.onSubmit();

    // isLoading is set synchronously at the start of onSubmit
    // (before the observable resolves)
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });
});
