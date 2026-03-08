
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { AddEmployeeComponent } from '../add-employee/add-employee.component';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { EmployeeTableComponent } from '../../components/employee-table/employee-table.component';
import { EmployeeFiltersComponent } from '../../components/employee-filters/employee-filters.component';
import { EmployeePaginationComponent } from '../../components/employee-pagination/employee-pagination.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterModule,
    AddEmployeeComponent,
    EmployeeTableComponent,
    EmployeeFiltersComponent,
    EmployeePaginationComponent
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private employeeService = inject(EmployeeService);
  private masterData = inject(MasterDataService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);
  private csvExport = inject(CsvExportService);
  private cdr = inject(ChangeDetectorRef);

  employees: Employee[] = [];
  loading: boolean = false;
  searchTerm: string = '';

  showEditDrawer = false;
  selectedEmployeeId: string | null = null;

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPagesCount: number = 0;

  protected readonly Math = Math;

  deptMap: { [key: string]: string } = {};
  posMap: { [key: string]: string } = {};

  ngOnInit() {
    this.loadMasterData();
    this.loadEmployees();
    this.searchInput$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(() => {
        this.currentPage = 1;
        this.loading = true;
        this.cdr.markForCheck();
        return this.employeeService.getEmployees({
          pageSize: this.pageSize,
          pageNumber: this.currentPage,
          searchTerm: this.searchTerm
        }).pipe(catchError(() => EMPTY));
      }),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.employees = data.items;
      this.totalItems = data.totalCount;
      this.totalPagesCount = data.totalPages;
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  loadMasterData() {
    this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (depts: Department[]) => {
        depts.forEach((d: Department) => {
          if (d.id) this.deptMap[d.id] = d.name;
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load departments', err);
        this.toastService.showError('Load Error', 'Failed to load departments');
      }
    });

    this.masterData.getPositions$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (positions: Position[]) => {
        positions.forEach((p: Position) => {
          if (p.id) this.posMap[p.id] = p.title;
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load positions', err);
        this.toastService.showError('Load Error', 'Failed to load positions');
      }
    });
  }

  onAddEmployee() {
    this.selectedEmployeeId = null;
    this.showEditDrawer = true;
  }

  closeEditDrawer() {
    this.showEditDrawer = false;
    this.selectedEmployeeId = null;
  }

  onEmployeeSaved() {
    this.closeEditDrawer();
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getEmployees({
      pageSize: this.pageSize,
      pageNumber: this.currentPage,
      searchTerm: this.searchTerm
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.employees = data.items;
        this.totalItems = data.totalCount;
        this.totalPagesCount = data.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading employees', err);
        this.toastService.showError('Load Error', 'Failed to load employees');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    if (this.prefetchTimer) clearTimeout(this.prefetchTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    this.searchInput$.next(this.searchTerm);
  }

  onSearch() {
    this.currentPage = 1;
    this.loadEmployees();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadEmployees();
  }

  get paginatedEmployees(): Employee[] {
    return this.employees;
  }

  get totalPages(): number {
    return this.totalPagesCount || 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPagesCount) {
      this.currentPage = page;
      this.loadEmployees();
    }
  }

  exportEmployeesCsv(): void {
    if (!this.employees.length) {
      this.toastService.showWarn('No Data', 'No employees to export.');
      return;
    }
    const rows = this.employees.map(e => ({
      Name: e.fullName || '',
      Email: e.email || '',
      Department: this.getDepartmentName(e),
      Position: this.getPositionTitle(e),
      Status: e.status || e.Status || e.jobDetails?.status || 'Unknown',
      EmploymentType: e.employmentType || e.EmploymentType || e.jobDetails?.['employmentType'] || 'Full time',
      JoinDate: e.jobDetails?.joinDate ? new Date(e.jobDetails.joinDate).toLocaleDateString() : ''
    }));
    this.csvExport.export(rows, `Employees_${new Date().toISOString().slice(0, 10)}`);
    this.toastService.showSuccess('Exported', `${rows.length} employees exported to CSV.`);
  }

  getDepartmentName(employee: Employee): string {
    const name = employee.departmentName || employee.DepartmentName;
    if (name && name !== 'N/A') return name;
    const id = employee.jobDetails?.departmentId;
    if (id && this.deptMap[id]) return this.deptMap[id];
    return name || '-';
  }

  getPositionTitle(employee: Employee): string {
    const name = employee.positionName || employee.PositionName;
    if (name && name !== 'N/A') return name;
    const id = employee.jobDetails?.positionId;
    if (id && this.posMap[id]) return this.posMap[id];
    return name || '-';
  }

  private prefetchTimer: ReturnType<typeof setTimeout> | null = null;
  prefetchEmployee(id: string): void {
    if (this.prefetchTimer) clearTimeout(this.prefetchTimer);
    this.prefetchTimer = setTimeout(() => {
      this.employeeService.getEmployeeById(id).pipe(takeUntil(this.destroy$)).subscribe();
    }, 150);
  }
}
