import {
  Component,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { ErrorHandlerService } from '@core/services/error-handler.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordComponent implements OnDestroy {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pw = g.get('newPassword')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const { currentPassword, newPassword, confirmPassword } = this.form.value;

    this.authService
      .changePassword(currentPassword, newPassword, confirmPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.errorHandler.showSuccess('Password changed successfully!', 'Done');
          this.router.navigate(['/dashboard']);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage =
            (err.error as { message?: string })?.message || 'Failed to change password. Please try again.';
          this.errorHandler.handleHttpError(err, 'Change password');
          this.cdr.markForCheck();
        }
      });
  }

  signOut(): void {
    this.authService.logout('user_choice');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
