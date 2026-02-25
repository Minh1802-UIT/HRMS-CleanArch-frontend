
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { AddEmployeeComponent } from '../add-employee/add-employee.component';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { UploadService } from '@features/employee/services/upload.service';
import { CsvExportService } from '@core/services/csv-export.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [NgClass, FormsModule, RouterModule, AddEmployeeComponent],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // ... properties (omitted for brevity)
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  loading: boolean = false;
  searchTerm: string = '';
  
  // Modal/Drawer State
  showEditDrawer = false;
  showViewDrawer = false;
  selectedEmployeeId: string | null = null;
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPagesCount: number = 0;

  // Stats
  totalEmployees: number = 0;
  activeEmployees: number = 0;
  newHires: number = 0;

  Math = Math;

  // Master Data Maps
  deptMap: { [key: string]: string } = {}; // Renamed from departmentsMap
  posMap: { [key: string]: string } = {}; // Renamed from positionsMap

  constructor(
    private employeeService: EmployeeService,
    private masterData: MasterDataService, // Injected MasterDataService
    private router: Router,
    private toastService: ToastService,
    private logger: LoggerService,
    private uploadService: UploadService,
    private csvExport: CsvExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMasterData();
    this.loadEmployees();
  }

  loadMasterData() {
    // Load Departments from MasterDataService
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

    // Load Positions from MasterDataService
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

  getDepartmentName(employee: Employee): string {
    // 1. Try flattened DTO property (Backend Paged List)
    const name = employee.departmentName || employee.DepartmentName;
    if (name && name !== 'N/A') return name;
    
    // 2. Try lookup map (Backend Full DTO / Local Master Data)
    const id = employee.jobDetails?.departmentId;
    if (id && this.deptMap[id]) return this.deptMap[id];
    
    // 3. Fallback
    return name || '-';
  }

  getPositionTitle(employee: Employee): string {
    // 1. Try flattened DTO property
    const name = employee.positionName || employee.PositionName;
    if (name && name !== 'N/A') return name;
    
    // 2. Try lookup map
    const id = employee.jobDetails?.positionId;
    if (id && this.posMap[id]) return this.posMap[id];
    
    // 3. Fallback
    return name || '-';
  }

  onAddEmployee() {
    this.selectedEmployeeId = null; // Clear ID for Add Mode
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
    this.employeeService.getEmployees({ pageSize: this.pageSize, pageNumber: this.currentPage }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.employees = data.items;
        this.totalItems = data.totalCount;
        this.totalPagesCount = data.totalPages;
        this.loading = false;
        this.calculateStats();
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  calculateStats() {
    this.totalEmployees = this.totalItems;
    this.activeEmployees = this.employees.filter(e => (e.status || e.jobDetails?.status) === 'Active').length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.newHires = this.employees.filter(e => {
        const joinDate = e.jobDetails?.joinDate ? new Date(e.jobDetails.joinDate) : null;
        return joinDate && joinDate > thirtyDaysAgo;
    }).length;
  }

  updatePagination() {
     this.totalItems = this.filteredEmployees.length;
     if (this.currentPage > this.totalPages) {
         this.currentPage = 1;
     }
  }

  onSearch() {
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
  


  getStatus(employee: Employee): string {
    return employee.status || employee.Status || employee.jobDetails?.status || 'Unknown';
  }

  getStatusClass(employee: Employee): string {
    const status = this.getStatus(employee);
    switch (status) {
        case 'Active': return 'status-active';
        case 'Resigned': return 'status-resigned';
        case 'Terminated': return 'status-terminated';
        case 'On Leave': return 'status-orange';
        default: return 'status-resigned';
    }
  }

  getEmploymentType(employee: Employee): string {
    // Handle dynamic properties from backend (mixed casing)
    return employee.employmentType || employee.EmploymentType || employee.jobDetails?.['employmentType'] || 'Full time';
  }

  getEmploymentTypeClass(employee: Employee): string {
    const type = this.getEmploymentType(employee).toLowerCase();
    switch (type) {
      case 'full time':
      case 'full-time':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'part time':
      case 'part-time':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'contractor':
      case 'contract':
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filteredEmployees = this.employees;
    this.updatePagination();
    this.currentPage = 1;
  }

  getAvatarUrl(path: string | undefined): string {
    return this.uploadService.getFileUrl(path);
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
      Status: this.getStatus(e),
      EmploymentType: this.getEmploymentType(e),
      JoinDate: e.jobDetails?.joinDate ? new Date(e.jobDetails.joinDate).toLocaleDateString() : ''
    }));
    this.csvExport.export(rows, `Employees_${new Date().toISOString().slice(0, 10)}`);
    this.toastService.showSuccess('Exported', `${rows.length} employees exported to CSV.`);
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }

  trackByPage(index: number, page: number): number {
    return page;
  }
}
