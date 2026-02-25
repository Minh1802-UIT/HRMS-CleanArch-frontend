import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DepartmentService, Department } from '@features/organization/services/department.service';
import { PositionService, Position } from '@features/organization/services/position.service';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MasterDataService } from '@features/organization/services/master-data.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [NgClass, FormsModule, ReactiveFormsModule],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Data
  departments: Department[] = [];
  filteredDepartments: Department[] = [];
  selectedDepartment: Department | null = null;
  positions: Position[] = [];

  // UI States
  loading = false;
  searchTerm = '';
  
  // Modals
  isDeptModalOpen = false;
  isPosModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';

  // Forms
  deptForm: FormGroup;
  posForm: FormGroup;

  constructor(
    private deptService: DepartmentService,
    private posService: PositionService,
    private fb: FormBuilder,
    private logger: LoggerService,
    private masterData: MasterDataService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.deptForm = this.fb.group({
      id: [''], 
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      managerId: ['']
    });

    this.posForm = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      code: ['', Validators.required],
      departmentId: ['', Validators.required],
      salaryMin: [0, [Validators.required, Validators.min(0)]],
      salaryMax: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', Validators.required]
    });
  }

  ngOnInit() {
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Department Logic ---

  loadDepartments() {
    this.loading = true;
    this.deptService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.departments = data;
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading departments', err);
        this.toastService.showError('Error', err?.error?.message || 'Failed to load departments');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase();
    this.filteredDepartments = this.departments.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(term) || (d.code && d.code.toLowerCase().includes(term));
      return matchSearch;
    });
  }

  selectDepartment(dept: Department) {
    this.selectedDepartment = dept;
    this.loadPositions(dept.id!);
  }

  openDeptModal(mode: 'create' | 'edit', dept?: Department) {
    this.modalMode = mode;
    this.isDeptModalOpen = true;
    if (mode === 'edit' && dept) {
      this.deptForm.patchValue(dept);
    } else {
      this.deptForm.reset();
    }
  }

  closeDeptModal() {
    this.isDeptModalOpen = false;
  }

  saveDepartment() {
    if (this.deptForm.invalid) return;
    const val = this.deptForm.value;
    const deptData: Department = {
      name: val.name,
      code: val.code,
      description: val.description, 
      managerId: val.managerId
    }; 

    if (this.modalMode === 'create') {
      this.deptService.createDepartment(deptData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
            this.loadDepartments();
            this.closeDeptModal();
            this.masterData.refreshDepartments();
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.logger.error('Error creating department', err);
            this.toastService.showError('Create Error', err?.error?.message || 'Failed to create department');
        }
      });
    } else {
      this.deptService.updateDepartment(val.id, deptData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
            this.loadDepartments();
            this.closeDeptModal();
            this.masterData.refreshDepartments();
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.logger.error('Error updating department', err);
            this.toastService.showError('Update Error', err?.error?.message || 'Failed to update department');
        }
      });
    }
  }

  deleteDepartment(dept: Department, event: Event) {
    event.stopPropagation();
    if (!dept.id) return;
    if (confirm(`Delete department ${dept.name}?`)) {
      this.deptService.deleteDepartment(dept.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.loadDepartments();
          if (this.selectedDepartment?.id === dept.id) {
            this.selectedDepartment = null;
            this.positions = [];
          }
          this.masterData.refreshDepartments();
          this.cdr.markForCheck();
        },
        error: (err) => this.logger.error('Error deleting department', err)
      });
    }
  }

  // --- Position Logic ---

  loadPositions(deptId: string | undefined) {
    if (!deptId) return;
    this.posService.getByDepartment(deptId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.positions = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.warn('Direct department fetch might have failed, attempting fallback', err);
        this.posService.getPositions().pipe(takeUntil(this.destroy$)).subscribe(all => {
             this.positions = all.filter(p => p.departmentId === deptId);
             this.cdr.markForCheck();
        });
      }
    });
  }

  openPosModal(mode: 'create' | 'edit', pos?: Position) {
    this.modalMode = mode;
    this.isPosModalOpen = true;
    if (mode === 'edit' && pos) {
      this.posForm.patchValue({
        id: pos.id,
        title: pos.title,
        code: pos.code,
        departmentId: pos.departmentId,
        salaryMin: pos.salaryRange?.min,
        salaryMax: pos.salaryRange?.max,
        currency: pos.salaryRange?.currency || 'USD'
      });
    } else {
      this.posForm.reset({
        departmentId: this.selectedDepartment?.id,
        currency: 'USD'
      });
    }
  }

  closePosModal() {
    this.isPosModalOpen = false;
  }

  savePosition() {
    if (this.posForm.invalid) return;
    const val = this.posForm.value;
    const posPayload: Position = {
        title: val.title,
        code: val.code,
        departmentId: val.departmentId,
        salaryRange: {
            min: val.salaryMin, 
            max: val.salaryMax, 
            currency: val.currency 
        }
    };

    if (this.modalMode === 'create') {
        this.posService.createPosition(posPayload).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                if (this.selectedDepartment && this.selectedDepartment.id) this.loadPositions(this.selectedDepartment.id);
                this.closePosModal();
                this.toastService.showSuccess('Success', 'Position created successfully');
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.logger.error('Error creating position', err);
                this.toastService.showError('Error', err?.error?.message || 'Failed to create position');
            }
        });
    } else {
        this.posService.updatePosition(val.id, posPayload).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                if (this.selectedDepartment && this.selectedDepartment.id) this.loadPositions(this.selectedDepartment.id);
                this.closePosModal();
                this.toastService.showSuccess('Success', 'Position updated successfully');
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.logger.error('Error updating position', err);
                this.toastService.showError('Error', err?.error?.message || 'Failed to update position');
            }
        });
    }
  }
  
  deletePosition(pos: Position) {
      if(!pos.id) return;
      if(confirm(`Delete position ${pos.title}?`)) {
          this.posService.deletePosition(pos.id).pipe(takeUntil(this.destroy$)).subscribe({
              next: () => {
                  if (this.selectedDepartment && this.selectedDepartment.id) this.loadPositions(this.selectedDepartment.id);
                  this.toastService.showSuccess('Success', 'Position deleted successfully');
                  this.cdr.markForCheck();
              },
              error: (err) => {
                  this.logger.error('Error deleting position', err);
                  this.toastService.showError('Delete Error', err?.error?.message || 'Failed to delete position');
              }
          });
      }
  }

  trackByDeptId(index: number, dept: Department): string { return dept.id ?? String(index); }
}
