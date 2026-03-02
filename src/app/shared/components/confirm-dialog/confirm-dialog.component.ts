import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { ConfirmDialogService, ConfirmState } from '@core/services/confirm-dialog.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgClass],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  state: ConfirmState | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private confirmService: ConfirmDialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.confirmService.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.state = state;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  confirm() { this.confirmService.resolve(true); }
  cancel()  { this.confirmService.resolve(false); }

  get iconClass(): string {
    const map: Record<string, string> = {
      danger: 'pi-trash',
      warning: 'pi-exclamation-triangle',
      info: 'pi-info-circle',
      success: 'pi-check-circle'
    };
    return map[this.state?.type ?? 'danger'] ?? 'pi-question-circle';
  }

  get iconBgClass(): string {
    const map: Record<string, string> = {
      danger:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      info:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    };
    return map[this.state?.type ?? 'danger'] ?? 'bg-red-100 text-red-600';
  }

  get confirmBtnClass(): string {
    const map: Record<string, string> = {
      danger:  'bg-red-600 hover:bg-red-500 focus:ring-red-500',
      warning: 'bg-amber-500 hover:bg-amber-400 focus:ring-amber-400',
      info:    'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500',
      success: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'
    };
    return map[this.state?.type ?? 'danger'] ?? 'bg-red-600 hover:bg-red-500';
  }
}
