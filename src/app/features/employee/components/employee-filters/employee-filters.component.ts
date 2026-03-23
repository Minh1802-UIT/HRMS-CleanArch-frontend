import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 mb-6 rounded-2xl glass-panel elevated-card animate-fade-in">
      <!-- Filters Row -->
      <div class="flex flex-col gap-4 justify-between xl:flex-row xl:items-center">
        <div class="flex flex-col flex-1 gap-4 items-start w-full md:flex-row md:items-center">
          <!-- Search Input -->
          <div class="relative w-full md:w-80">
            <div class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <span class="text-zinc-400 material-symbols-outlined">search</span>
            </div>
            <input
              type="text"
              [ngModel]="searchTerm"
              (ngModelChange)="onSearchTermChange($event)"
              (keyup.enter)="onSearch()"
              class="block py-2.5 pr-10 pl-10 w-full text-sm placeholder-zinc-400 text-zinc-900 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all hover:border-zinc-300 dark:hover:border-zinc-600"
              placeholder="Search employees..."
            />
            @if (searchTerm) {
              <button
                type="button"
                (click)="clearFilters()"
                class="flex absolute inset-y-0 right-0 items-center pr-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                aria-label="Clear search"
              >
                <span class="text-sm material-symbols-outlined">close</span>
              </button>
            }
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="clearFilters()"
            class="text-sm font-medium text-zinc-500 whitespace-nowrap transition-colors dark:text-zinc-400 hover:text-violet-600"
          >
            Clear filters
          </button>
          <!-- Export Button -->
          <button
            type="button"
            (click)="exportCsv.emit()"
            class="inline-flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
          >
            <span class="material-symbols-outlined text-lg">download</span>
            Export
          </button>
        </div>
      </div>
    </div>
  `
})
export class EmployeeFiltersComponent {
  @Input() searchTerm: string = '';
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() searchInput = new EventEmitter<void>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() exportCsv = new EventEmitter<void>();

  onSearchTermChange(val: string): void {
    this.searchTerm = val;
    this.searchTermChange.emit(this.searchTerm);
    this.searchInput.emit();
  }

  onSearch(): void {
    this.search.emit();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.searchTermChange.emit(this.searchTerm);
    this.clear.emit();
  }
}
