import {
  Component,
  OnInit,
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  succeeded = false;
  errorMessage = '';
  private email = '';
  private token = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.email || !this.token) {
      this.errorMessage = 'Invalid or expired reset link. Please request a new one.';
    }
  }

  private passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pw = g.get('newPassword')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
  }

  onSubmit(): void {
    if (this.form.invalid || !this.email || !this.token) return;
    this.isLoading = true;
    this.errorMessage = '';
    const { newPassword, confirmPassword } = this.form.value;

    this.authService
      .resetPassword(this.email, this.token, newPassword, confirmPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.succeeded = true;
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage =
            (err.error as { message?: string })?.message ||
            'Failed to reset password. The link may have expired.';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
