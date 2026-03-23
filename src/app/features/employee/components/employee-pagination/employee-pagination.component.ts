import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-employee-pagination',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col justify-between items-center px-1 mt-6 sm:flex-row animate-fade-in">
      <div class="mb-4 text-sm text-zinc-500 dark:text-zinc-400 sm:mb-0">
        Showing
        <span class="font-bold text-zinc-900 dark:text-white">{{ startItem }}</span>
        &ndash;
        <span class="font-bold text-zinc-900 dark:text-white">{{ endItem }}</span>
        of
        <span class="font-bold text-zinc-900 dark:text-white">{{ totalItems }}</span>
        results
      </div>
      <nav aria-label="Pagination" class="flex items-center gap-1">
        <button
          type="button"
          (click)="goToPage.emit(currentPage - 1)"
          [disabled]="currentPage === 1"
          aria-label="Previous page"
          class="inline-flex items-center justify-center w-9 h-9 text-sm font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-zinc-200 transition-all"
        >
          <span class="text-lg material-symbols-outlined">chevron_left</span>
        </button>
        @for (page of pageNumbers; track page) {
          <button
            type="button"
            (click)="goToPage.emit(page)"
            [attr.aria-label]="'Page ' + page"
            [attr.aria-current]="page === currentPage ? 'page' : null"
            [ngClass]="
              page === currentPage
                ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 hover:text-violet-600 dark:hover:text-violet-400'
            "
            class="inline-flex items-center justify-center w-9 h-9 text-sm font-bold rounded-xl border transition-all"
          >
            {{ page }}
          </button>
        }
        <button
          type="button"
          (click)="goToPage.emit(currentPage + 1)"
          [disabled]="currentPage === totalPages"
          aria-label="Next page"
          class="inline-flex items-center justify-center w-9 h-9 text-sm font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-zinc-200 transition-all"
        >
          <span class="text-lg material-symbols-outlined">chevron_right</span>
        </button>
      </nav>
    </div>
  `
})
export class EmployeePaginationComponent {
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() totalItems: number = 0;
  @Input() totalPages: number = 1;
  @Output() goToPage = new EventEmitter<number>();

  get startItem(): number {
    return Math.min((this.currentPage - 1) * this.pageSize + 1, this.totalItems);
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}
