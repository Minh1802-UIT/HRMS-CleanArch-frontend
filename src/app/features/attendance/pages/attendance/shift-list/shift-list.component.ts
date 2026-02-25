import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, SlicePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Shift, ShiftService } from '@features/attendance/services/shift.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [NgClass, SlicePipe, RouterModule, FormsModule],
  templateUrl: './shift-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftListComponent implements OnInit, OnDestroy {
  shifts: Shift[] = [];
  loading = false;
  private destroy$ = new Subject<void>();
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;
  
  // Search
  searchTerm = '';

  constructor(
    private shiftService: ShiftService,
    private toastService: ToastService,
    private logger: LoggerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadShifts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShifts() {
    this.loading = true;
    const params = {
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm
    };

    this.shiftService.getShiftsPaged(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.shifts = result.items;
        this.totalRecords = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading shifts', err);
        this.toastService.showError('Error', 'Failed to load shifts');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadShifts();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadShifts();
    }
  }

  editShift(id: string) {
    this.router.navigate(['/attendance/shifts/edit', id]);
  }

  deleteShift(id: string) {
    if (confirm('Are you sure you want to delete this shift?')) {
      this.shiftService.deleteShift(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Success', 'Shift deleted successfully');
          this.loadShifts();
        },
        error: (err) => {
          this.logger.error('Error deleting shift', err);
          this.toastService.showError('Error', 'Failed to delete shift');
        }
      });
    }
  }

  getPages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
    }
    return pages;
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByPage(index: number, page: number): number { return page; }
}
