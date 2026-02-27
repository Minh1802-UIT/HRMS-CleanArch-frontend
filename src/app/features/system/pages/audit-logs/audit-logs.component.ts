import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '@features/system/services/audit-log.service';
import { AuditLog } from '@core/models/audit-log.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  loading = false;
  searchTerm = '';
  startDate = '';
  endDate = '';
  actionType = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  protected readonly Math = Math;

  actionTypes = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'RoleAssignment'];
  private destroy$ = new Subject<void>();

  constructor(private auditLogService: AuditLogService, private toast: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs() {
    this.loading = true;
    this.auditLogService.getAuditLogs(
      this.currentPage,
      this.pageSize,
      this.searchTerm,
      this.startDate,
      this.endDate,
      this.actionType
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.logs = result.items;
        this.totalItems = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.showError('Load Error', err?.error?.message || 'Failed to load audit logs');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadLogs();
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getActionBadgeClass(action: string): string {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-700 border-green-200';
      case 'update': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delete': return 'bg-red-100 text-red-700 border-red-200';
      case 'login': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'roleassignment': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  trackByActionType(index: number, type: string): string { return type; }
  trackByLogId(index: number, log: AuditLog): string { return log.id || String(index); }
  trackByPage(index: number, page: number): number { return page; }
}
