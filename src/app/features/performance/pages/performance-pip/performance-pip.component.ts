import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceService } from '../../services/performance.service';
import { PIP, PIPStatus, PIPObjective, PIPCreatePayload } from '../../models/performance.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/models/employee.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-performance-pip',
  standalone: true,
  imports: [NgClass, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './performance-pip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformancePipComponent implements OnInit, OnDestroy {
  pips: PIP[] = [];
  isLoading = true;

  // Filters
  statusFilter: number | 'all' = 'all';
  searchTerm = '';

  // Create PIP Modal
  isCreateModalOpen = false;
  isSubmitting = false;

  // PIP Detail Modal
  isDetailModalOpen = false;
  selectedPip: PIP | null = null;

  // Create PIP Form
  newPip: PIPCreatePayload = {
    employeeId: '',
    managerId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    objectives: [{ description: '', successCriteria: '', progress: 0 }]
  };

  // Employee Search
  employeeSearchTerm = '';
  employeeSearchResults: Employee[] = [];
  showEmployeeDropdown = false;
  isSearchingEmployee = false;
  private employeeSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private toastService: ToastService,
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPIPs();
    const user = this.authService.user();
    if (user?.id) {
      this.newPip.managerId = user.id;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPIPs(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.performanceService.getActivePIPs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (pips) => {
        this.pips = pips;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredPIPs(): PIP[] {
    let result = this.pips;
    if (this.statusFilter !== 'all') {
      result = result.filter(p => p.status === this.statusFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.employeeName?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    return result;
  }

  // ===== Employee Search =====

  onEmployeeSearch(term: string): void {
    this.employeeSearchTerm = term;
    if (this.employeeSearchTimeout) clearTimeout(this.employeeSearchTimeout);
    if (!term.trim()) {
      this.employeeSearchResults = [];
      this.showEmployeeDropdown = false;
      return;
    }
    this.employeeSearchTimeout = setTimeout(() => {
      this.isSearchingEmployee = true;
      this.employeeService.getEmployees({ pageSize: 10, pageNumber: 1, searchTerm: term }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: result => {
          this.employeeSearchResults = (result.items || []).filter(e => e.status !== 'Terminated' && e.status !== 'Resigned');
          this.isSearchingEmployee = false;
          this.showEmployeeDropdown = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSearchingEmployee = false;
          this.cdr.markForCheck();
        }
      });
    }, 300);
  }

  selectEmployee(employee: Employee): void {
    this.newPip.employeeId = employee.id;
    this.employeeSearchTerm = employee.fullName;
    this.showEmployeeDropdown = false;
    this.employeeSearchResults = [];
    this.cdr.markForCheck();
  }

  closeEmployeeDropdown(): void {
    setTimeout(() => { this.showEmployeeDropdown = false; this.cdr.markForCheck(); }, 200);
  }

  // ===== Create Modal =====

  openCreateModal(): void {
    const user = this.authService.user();
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(today.getMonth() + 3);
    this.newPip = {
      employeeId: '',
      managerId: user?.id || '',
      title: '',
      description: '',
      startDate: today.toISOString().split('T')[0],
      endDate: threeMonthsLater.toISOString().split('T')[0],
      objectives: [{ description: '', successCriteria: '', progress: 0 }]
    };
    this.employeeSearchTerm = '';
    this.isCreateModalOpen = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.cdr.markForCheck();
  }

  addObjective(): void {
    this.newPip.objectives.push({ description: '', successCriteria: '', progress: 0 });
    this.cdr.markForCheck();
  }

  removeObjective(index: number): void {
    if (this.newPip.objectives.length > 1) {
      this.newPip.objectives.splice(index, 1);
      this.cdr.markForCheck();
    }
  }

  submitPIP(): void {
    if (!this.newPip.employeeId) {
      this.toastService.showWarn('Validation', 'Please select an employee.');
      return;
    }
    if (!this.newPip.title.trim()) {
      this.toastService.showWarn('Validation', 'Please enter a title.');
      return;
    }
    if (!this.newPip.startDate || !this.newPip.endDate) {
      this.toastService.showWarn('Validation', 'Please select start and end dates.');
      return;
    }
    if (this.newPip.objectives.some(o => !o.description.trim())) {
      this.toastService.showWarn('Validation', 'All objectives must have a description.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.performanceService.createPIP(this.newPip).pipe(takeUntil(this.destroy$)).subscribe({
      next: (id) => {
        this.isSubmitting = false;
        if (id) {
          this.toastService.showSuccess('PIP Created', 'Performance Improvement Plan has been created.');
          this.closeCreateModal();
          this.loadPIPs();
        } else {
          this.toastService.showError('Save Failed', 'Could not create PIP.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSubmitting = false;
        this.toastService.showError('Save Failed', 'Could not create PIP.');
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Detail Modal =====

  openDetail(pip: PIP): void {
    this.selectedPip = pip;
    this.isDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.isDetailModalOpen = false;
    this.selectedPip = null;
    this.cdr.markForCheck();
  }

  startPIP(pip: PIP): void {
    this.performanceService.startPIP(pip.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.showSuccess('PIP Started', 'The PIP has been activated.');
          this.loadPIPs();
          this.closeDetail();
        } else {
          this.toastService.showError('Action Failed', 'Could not start the PIP.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  completePIP(pip: PIP, successful: boolean): void {
    const notes = successful ? 'Employee successfully completed the PIP.' : 'Employee did not meet the objectives.';
    this.performanceService.completePIP(pip.id, { outcomeNotes: notes, successful }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.showSuccess(successful ? 'PIP Completed' : 'PIP Failed',
            successful ? 'Employee has successfully completed the PIP.' : 'PIP has been marked as failed.');
          this.loadPIPs();
          this.closeDetail();
        } else {
          this.toastService.showError('Action Failed', 'Could not complete the PIP.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  cancelPIP(pip: PIP): void {
    const reason = 'Cancelled by HR/Manager.';
    this.performanceService.cancelPIP(pip.id, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.showSuccess('PIP Cancelled', 'The PIP has been cancelled.');
          this.loadPIPs();
          this.closeDetail();
        } else {
          this.toastService.showError('Action Failed', 'Could not cancel the PIP.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Status Helpers =====

  getStatusLabel(status: PIPStatus): string {
    switch (status) {
      case PIPStatus.Draft: return 'Draft';
      case PIPStatus.InProgress: return 'In Progress';
      case PIPStatus.Completed: return 'Completed';
      case PIPStatus.Failed: return 'Failed';
      case PIPStatus.Cancelled: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  getStatusStyle(status: PIPStatus): string {
    switch (status) {
      case PIPStatus.Draft: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      case PIPStatus.InProgress: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case PIPStatus.Completed: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case PIPStatus.Failed: return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case PIPStatus.Cancelled: return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}
