import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { NgClass, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '@features/system/services/audit-log.service';
import { AuditLog } from '@core/models/audit-log.model';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [NgClass, DatePipe, SlicePipe, FormsModule],
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
  selectedLog: AuditLog | null = null;
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  constructor(private auditLogService: AuditLogService, private toast: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadLogs();
    // Debounce text search: wait 400ms after user stops typing
    this.searchInput$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => {
        this.loading = true;
        this.currentPage = 1;
        this.cdr.markForCheck();
        return this.auditLogService.getAuditLogs(
          this.currentPage, this.pageSize, term,
          this.startDate, this.endDate, this.actionType
        ).pipe(
          catchError(err => {
            this.toast.showError('Load Error', err?.error?.message || 'Failed to load audit logs');
            this.loading = false;
            this.cdr.markForCheck();
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.logs = result.items;
      this.totalItems = result.totalCount;
      this.totalPages = result.totalPages;
      this.loading = false;
      this.cdr.markForCheck();
    });
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

  onSearchInput() {
    this.searchInput$.next(this.searchTerm);
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.startDate || this.endDate || this.actionType);
  }

  get dateError(): string | null {
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      return 'End date must be after start date';
    }
    return null;
  }

  clearFilters() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.actionType = '';
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

  // ── Detail Panel ──────────────────────────────────────────

  openDetail(log: AuditLog): void {
    this.selectedLog = log;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selectedLog = null;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeDetail(); }

  parseJson(val: string | null): Record<string, unknown> | null {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }

  objectKeys(obj: Record<string, unknown> | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /** Keys that have changed between oldValues and newValues */
  changedKeys(old: Record<string, unknown> | null, nv: Record<string, unknown> | null): Set<string> {
    if (!old || !nv) return new Set();
    const changed = new Set<string>();
    const allKeys = new Set([...Object.keys(old), ...Object.keys(nv)]);
    allKeys.forEach(k => {
      if (JSON.stringify(old[k]) !== JSON.stringify(nv[k])) changed.add(k);
    });
    return changed;
  }

  /** All keys from old + new merged and deduplicated */
  mergedKeys(old: Record<string, unknown> | null, nv: Record<string, unknown> | null): string[] {
    const set = new Set<string>();
    if (old) Object.keys(old).forEach(k => set.add(k));
    if (nv) Object.keys(nv).forEach(k => set.add(k));
    return Array.from(set);
  }

  formatValue(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  }

  // Getters for the detail drawer (avoids @let which requires Angular 18+)
  get selectedOldObj(): Record<string, unknown> | null {
    return this.parseJson(this.selectedLog?.oldValues ?? null);
  }
  get selectedNewObj(): Record<string, unknown> | null {
    return this.parseJson(this.selectedLog?.newValues ?? null);
  }
  get selectedDiff(): Set<string> {
    return this.changedKeys(this.selectedOldObj, this.selectedNewObj);
  }
  get selectedMergedKeys(): string[] {
    return this.mergedKeys(this.selectedOldObj, this.selectedNewObj);
  }
}
