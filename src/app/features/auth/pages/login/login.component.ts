import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ErrorHandlerService } from '@core/services/error-handler.service';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { Subject } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private errorHandler: ErrorHandlerService,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .login(this.loginForm.value)
      .pipe(
        takeUntil(this.destroy$),
        timeout(120000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
      next: () => {
        const user = this.authService.currentUserValue;
        if (user?.mustChangePassword) {
          this.toastService.showSuccess('First Login', 'Welcome! Please set a new password to continue.');
          this.router.navigate(['/change-password']);
        } else {
          this.toastService.showSuccess('Login successful', 'Welcome back!');
          this.router.navigate(['/dashboard']);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Login error', err);
        const msg =
          err?.name === 'TimeoutError'
            ? 'Server took too long to respond (cold start). Please try again in a moment.'
            : err.error?.message || 'Invalid credentials or server error';
        this.errorMessage = msg;
        this.errorHandler.handleHttpError(err, 'Login');
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
