import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ErrorHandlerService } from '@core/services/error-handler.service';
import { LoggerService } from '@core/services/logger.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private errorHandler: ErrorHandlerService,
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

    this.authService.login(this.loginForm.value).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        const user = this.authService.currentUserValue;
        if (user?.mustChangePassword) {
          this.errorHandler.showSuccess('Welcome! Please set a new password to continue.', 'First Login');
          this.router.navigate(['/change-password']);
        } else {
          this.errorHandler.showSuccess('Welcome back!', 'Login successful');
          this.router.navigate(['/dashboard']);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.logger.error('Login error', err);
        const msg = err.error?.message || 'Invalid credentials or server error';
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

  onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
