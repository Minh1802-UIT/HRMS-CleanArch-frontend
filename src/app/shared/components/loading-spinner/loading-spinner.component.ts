import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center" [ngClass]="containerClass">
      <div 
        class="animate-spin rounded-full border-2 border-violet-200"
        [ngClass]="spinnerClass"
      ></div>
      @if (message) {
        <span class="ml-3 text-sm text-zinc-500 dark:text-zinc-400">{{ message }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() message?: string;
  @Input() fullPage = false;

  get spinnerClass(): string {
    const sizes = {
      sm: 'h-4 w-4 border-violet-400',
      md: 'h-8 w-8 border-violet-400',
      lg: 'h-12 w-12 border-violet-500'
    };
    return sizes[this.size];
  }

  get containerClass(): string {
    return this.fullPage 
      ? 'fixed inset-0 bg-white/80 dark:bg-zinc-900/80 z-50' 
      : 'p-4';
  }
}
