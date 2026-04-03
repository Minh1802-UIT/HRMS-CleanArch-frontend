import { Injectable, signal, WritableSignal, inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DepartmentService } from './department.service';
import { Department } from '../models/department.model';
import { PositionService } from './position.service';
import { Position } from '../models/position.model';
import { LeaveTypeService } from '@features/leave/services/leave-type.service';
import { LeaveType } from '@features/leave/models/leave-type.model';
import { LoggerService } from '@core/services/logger.service';

/**
 * Centralized Master Data Service with caching using Signals
 * Provides both Signal-based API (preferred) and Observable-based API (for backward compatibility)
 */
@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  // Signals for state management
  private departmentsSignal: WritableSignal<Department[]> = signal([]);
  private positionsSignal: WritableSignal<Position[]> = signal([]);
  private leaveTypesSignal: WritableSignal<LeaveType[]> = signal([]);
  private readonly injector = inject(Injector);

  // Public readonly signals
  public readonly departments = this.departmentsSignal.asReadonly();
  public readonly positions = this.positionsSignal.asReadonly();
  public readonly leaveTypes = this.leaveTypesSignal.asReadonly();

  // Loading state flags
  private departmentsLoaded = false;
  private positionsLoaded = false;
  private leaveTypesLoaded = false;

  // Loading in progress flags
  private departmentsLoading = false;
  private positionsLoading = false;
  private leaveTypesLoading = false;

  constructor(
    private deptService: DepartmentService,
    private posService: PositionService,
    private leaveTypeService: LeaveTypeService,
    private logger: LoggerService
  ) {
    this.logger.debug('MasterDataService initialized');
  }

  // ========================================
  // Public Signals API (Preferred)
  // ========================================

  /**
   * Trigger lazy load of departments
   * Use with: masterData.departments() to get the signal value
   */
  loadDepartments(): void {
    if (!this.departmentsLoaded && !this.departmentsLoading) {
      this.fetchDepartments();
    }
  }

  /**
   * Trigger lazy load of positions
   * Use with: masterData.positions() to get the signal value
   */
  loadPositions(): void {
    if (!this.positionsLoaded && !this.positionsLoading) {
      this.fetchPositions();
    }
  }

  /**
   * Trigger lazy load of leave types
   * Use with: masterData.leaveTypes() to get the signal value
   */
  loadLeaveTypes(): void {
    if (!this.leaveTypesLoaded && !this.leaveTypesLoading) {
      this.fetchLeaveTypes();
    }
  }

  // ========================================
  // Backward Compatible Observable API
  // ========================================

  /**
   * Get departments observable - triggers lazy load if needed
   * @deprecated Use loadDepartments() + departments signal instead
   */
  getDepartments$(): Observable<Department[]> {
    if (!this.departmentsLoaded && !this.departmentsLoading) {
      this.fetchDepartments();
    }
    return toObservable(this.departmentsSignal, { injector: this.injector });
  }

  /**
   * Get positions observable - triggers lazy load if needed
   * @deprecated Use loadPositions() + positions signal instead
   */
  getPositions$(): Observable<Position[]> {
    if (!this.positionsLoaded && !this.positionsLoading) {
      this.fetchPositions();
    }
    return toObservable(this.positionsSignal, { injector: this.injector });
  }

  /**
   * Get leave types observable - triggers lazy load if needed
   * @deprecated Use loadLeaveTypes() + leaveTypes signal instead
   */
  getLeaveTypes$(): Observable<LeaveType[]> {
    if (!this.leaveTypesLoaded && !this.leaveTypesLoading) {
      this.fetchLeaveTypes();
    }
    return toObservable(this.leaveTypesSignal, { injector: this.injector });
  }

  // ========================================
  // Private Fetch Methods
  // ========================================

  private fetchDepartments(): void {
    this.departmentsLoading = true;
    this.logger.debug('Loading departments from API');

    this.deptService.getDepartments().pipe(
      tap(data => {
        this.departmentsSignal.set(data);
        this.departmentsLoaded = true;
        this.departmentsLoading = false;
        this.logger.debug(`Loaded ${data.length} departments`);
      })
    ).subscribe({
      error: (err) => {
        this.logger.error('Failed to load departments', err);
        this.departmentsLoading = false;
      }
    });
  }

  private fetchPositions(): void {
    this.positionsLoading = true;
    this.logger.debug('Loading positions from API');

    this.posService.getPositions().pipe(
      tap(data => {
        this.positionsSignal.set(data);
        this.positionsLoaded = true;
        this.positionsLoading = false;
        this.logger.debug(`Loaded ${data.length} positions`);
      })
    ).subscribe({
      error: (err) => {
        this.logger.error('Failed to load positions', err);
        this.positionsLoading = false;
      }
    });
  }

  private fetchLeaveTypes(): void {
    this.leaveTypesLoading = true;
    this.logger.debug('Loading leave types from API');

    this.leaveTypeService.getAll().pipe(
      tap(data => {
        this.leaveTypesSignal.set(data);
        this.leaveTypesLoaded = true;
        this.leaveTypesLoading = false;
        this.logger.debug(`Loaded ${data.length} leave types`);
      })
    ).subscribe({
      error: (err) => {
        this.logger.error('Failed to load leave types', err);
        this.leaveTypesLoading = false;
      }
    });
  }

  // ========================================
  // Refresh Methods (for CRUD operations)
  // ========================================

  /**
   * Refresh departments cache
   * Call this after creating/updating/deleting a department
   */
  refreshDepartments(): void {
    this.logger.debug('Refreshing departments cache');
    this.departmentsLoaded = false;
    this.fetchDepartments();
  }

  /**
   * Refresh positions cache
   * Call this after creating/updating/deleting a position
   */
  refreshPositions(): void {
    this.logger.debug('Refreshing positions cache');
    this.positionsLoaded = false;
    this.fetchPositions();
  }

  /**
   * Refresh leave types cache
   * Call this after creating/updating/deleting a leave type
   */
  refreshLeaveTypes(): void {
    this.logger.debug('Refreshing leave types cache');
    this.leaveTypesLoaded = false;
    this.fetchLeaveTypes();
  }

  /**
   * Refresh all master data caches
   */
  refreshAll(): void {
    this.logger.debug('Refreshing all master data caches');
    this.refreshDepartments();
    this.refreshPositions();
    this.refreshLeaveTypes();
  }

  // ========================================
  // Helper Methods (Quick Lookups)
  // ========================================

  /**
   * Get department by ID from cache
   * Returns undefined if not found or not loaded yet
   */
  getDepartmentById(id: string): Department | undefined {
    return this.departmentsSignal().find(d => d.id === id);
  }

  /**
   * Get position by ID from cache
   * Returns undefined if not found or not loaded yet
   */
  getPositionById(id: string): Position | undefined {
    return this.positionsSignal().find(p => p.id === id);
  }

  /**
   * Get leave type by ID from cache
   * Returns undefined if not found or not loaded yet
   */
  getLeaveTypeById(id: string): LeaveType | undefined {
    return this.leaveTypesSignal().find(lt => lt.id === id);
  }

  /**
   * Get department name by ID
   * Returns ID if not found (fallback for display)
   */
  getDepartmentName(id: string): string {
    const dept = this.getDepartmentById(id);
    return dept?.name || id;
  }

  /**
   * Get position title by ID
   * Returns ID if not found (fallback for display)
   */
  getPositionTitle(id: string): string {
    const pos = this.getPositionById(id);
    return pos?.title || id;
  }

  /**
   * Get leave type name by ID
   * Returns ID if not found (fallback for display)
   */
  getLeaveTypeName(id: string): string {
    const leaveType = this.getLeaveTypeById(id);
    return leaveType?.name || id;
  }
}
