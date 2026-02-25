import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LeaveAllocationService } from '@features/leave/services/leave-allocation.service';
import { LeaveAllocationDto } from '@features/leave/models/leave-allocation.model';
import { PagedResult } from '@core/models/api-response';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-leave-report',
  standalone: true,
  imports: [NgClass, DecimalPipe, FormsModule],
  templateUrl: './leave-report.component.html',
  styleUrls: ['./leave-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  allocations: LeaveAllocationDto[] = [];
  loading = false;
  
  // Pagination
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  Math = Math; // Make Math available in template

  keyword: string = ''; // Search keyword

  constructor(private leaveAllocationService: LeaveAllocationService, private logger: LoggerService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const pagination = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    this.leaveAllocationService.getAllAllocations(pagination, this.keyword).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: PagedResult<LeaveAllocationDto>) => {
        this.allocations = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load leave reports', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1; // Reset to first page
    this.loadData();
  }

  changePage(newPage: number): void {
    this.pageNumber = newPage;
    this.loadData();
  }

  getBalance(item: LeaveAllocationDto): number {
    return item.remainingDays ?? 0;
  }

  trackByIndex(index: number, item?: unknown): number { return index; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
