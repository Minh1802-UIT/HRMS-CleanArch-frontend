import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PositionService, Position } from '@features/organization/services/position.service';
import { Department, DepartmentService } from '@features/organization/services/department.service';
import { ToastService } from '@core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormInputComponent } from '../../../shared/components/form-input/form-input.component';
import { FormSelectComponent } from '../../../shared/components/form-select/form-select.component';

@Component({
  selector: 'app-position-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormInputComponent, FormSelectComponent],
  templateUrl: './position-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionFormComponent implements OnInit, OnDestroy {
  @Input() positionId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: FormGroup;
  isEditing = false;
  submitting = false;
  departments: Department[] = [];
  positions: Position[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private positionService: PositionService,
    private departmentService: DepartmentService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      code: ['', Validators.required],
      departmentId: [null],
      parentId: [null],
      description: [''],
      salaryRange: this.fb.group({
          min: [0],
          max: [0],
          currency: ['USD']
      })
    });
  }

  ngOnInit(): void {
    this.loadMasterData();
    if (this.positionId) {
      this.isEditing = true;
      this.loadPosition();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMasterData() {
    this.departmentService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.departments = data;
        this.cdr.markForCheck();
      },
      error: (err: any) => this.toast.showError('Load Error', err?.error?.message || 'Failed to load departments')
    });

    this.positionService.getPositions().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        // Exclude self from parent options if editing
        this.positions = this.positionId 
          ? data.filter(p => p.id !== this.positionId)
          : data;
        this.cdr.markForCheck();
      },
      error: (err: any) => this.toast.showError('Load Error', err?.error?.message || 'Failed to load positions')
    });
  }

  loadPosition() {
    if (!this.positionId) return;
    this.positionService.getPosition(this.positionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (pos) => {
        this.form.patchValue(pos);
        this.cdr.markForCheck();
      },
      error: (err: any) => this.toast.showError('Error', err?.error?.message || 'Failed to load position details')
    });
  }

  onSave() {
    if (this.form.invalid) return;
    this.submitting = true;

    const payload = this.form.value;

    const request = this.isEditing && this.positionId
        ? this.positionService.updatePosition(this.positionId, { ...payload, id: this.positionId })
        : this.positionService.createPosition(payload);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess('Success', `Position ${this.isEditing ? 'updated' : 'created'} successfully`);
        this.saved.emit();
      },
      error: (err: any) => {
        this.toast.showError('Error', err?.error?.message || 'Failed to save position');
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  onCancel() {
    this.close.emit();
  }
}
