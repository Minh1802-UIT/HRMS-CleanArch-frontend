import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './employee-directory.component.html',
  styleUrl: './employee-directory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDirectoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  loading: boolean = false;
  searchTerm: string = '';
  selectedOffice: string = '';
  selectedDepartment: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 8;
  totalItems: number = 0;

  protected readonly Math = Math;

  constructor(
    private employeeService: EmployeeService,
    private masterData: MasterDataService,
    private logger: LoggerService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getEmployees({ pageSize: this.pageSize, pageNumber: this.currentPage }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.employees = data.items;
        this.totalItems = data.totalCount;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading employees', err);
        this.toast.showError('Load Error', err?.error?.message || 'Failed to load employees');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let result = this.employees;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(emp =>
        emp.fullName.toLowerCase().includes(term) ||
        emp.employeeCode.toLowerCase().includes(term)
      );
    }

    this.filteredEmployees = result;
    this.updatePagination();
    this.currentPage = 1;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedOffice = '';
    this.selectedDepartment = '';
    this.filteredEmployees = this.employees;
    this.updatePagination();
    this.currentPage = 1;
  }

  updatePagination() {
    this.totalItems = this.filteredEmployees.length;
  }

  get paginatedEmployees(): Employee[] {
    return this.employees;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadEmployees();
    }
  }

  getPageNumbers(): number[] {
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

  getPositionTitle(employee: Employee): string {
    return employee.positionName || employee.PositionName || employee.jobDetails?.positionId || '-';
  }

  getAvatarBgColor(index: number): string {
    const colors = ['bg-orange-100', 'bg-green-100', 'bg-yellow-100', 'bg-blue-100', 'bg-cyan-100', 'bg-red-100', 'bg-purple-100', 'bg-pink-100'];
    return colors[index % colors.length];
  }

  getEmail(employee: Employee): string {
    return employee.email || 'N/A';
  }

  getPhone(employee: Employee): string {
    return employee.phoneNumber || employee.phone || employee.contactInfo?.phone || employee.personalInfo?.phoneNumber || 'N/A';
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }

  trackByPage(index: number, page: number): number {
    return page;
  }
}
