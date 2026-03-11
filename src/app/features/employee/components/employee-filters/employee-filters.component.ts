import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 mb-6 rounded-2xl glass-panel elevated-card">
      <!-- Action Buttons -->
      <div class="flex flex-col justify-end mb-5 space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
        <button
          type="button"
          (click)="exportCsv.emit()"
          class="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold bg-transparent rounded-lg border transition-colors border-violet-500 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
        >
          <span class="mr-2 text-sm material-symbols-outlined" aria-hidden="true">download</span>
          Export CSV
        </button>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-col gap-4 justify-between xl:flex-row xl:items-center">
        <div class="flex flex-col flex-1 gap-4 items-start w-full md:flex-row md:items-center">
          <!-- Search Input -->
          <div class="relative w-full md:w-64">
            <div class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              <span class="text-sm text-zinc-400 material-symbols-outlined">search</span>
            </div>
            <input
              type="text"
              [ngModel]="searchTerm"
              (ngModelChange)="onSearchTermChange($event)"
              (keyup.enter)="onSearch()"
              class="block py-2 pr-8 pl-10 w-full text-sm placeholder-zinc-400 text-zinc-900 bg-zinc-50 rounded-lg border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Search employees..."
            />
            @if (searchTerm) {
              <button
                type="button"
                (click)="clearFilters()"
                class="flex absolute inset-y-0 right-0 items-center pr-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="Clear search"
              >
                <span class="text-sm material-symbols-outlined">close</span>
              </button>
            }
          </div>
        </div>
        <button
          type="button"
          (click)="clearFilters()"
          class="self-end text-sm text-zinc-500 whitespace-nowrap transition-colors dark:text-zinc-400 hover:text-violet-600 xl:self-center"
        >
          Clear filters
        </button>
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
