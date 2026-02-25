import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DepartmentService } from './department.service';
import { Department } from '../models/department.model';
import { PositionService } from './position.service';
import { Position } from '../models/position.model';
import { LeaveTypeService } from '@features/leave/services/leave-type.service';
import { LeaveType } from '@features/leave/models/leave-type.model';
import { LoggerService } from '@core/services/logger.service';

/**
 * Centralized Master Data Service with caching using Signals and Subjects
 */
@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  // Signals for modern components
  private departmentsSignal: WritableSignal<Department[]> = signal([]);
  private positionsSignal: WritableSignal<Position[]> = signal([]);
  private leaveTypesSignal: WritableSignal<LeaveType[]> = signal([]);

  public readonly departments = this.departmentsSignal.asReadonly();
  public readonly positions = this.positionsSignal.asReadonly();
  public readonly leaveTypes = this.leaveTypesSignal.asReadonly();

  // BehaviorSubjects for backward compatibility
  private departments$ = new BehaviorSubject<Department[]>([]);
  private positions$ = new BehaviorSubject<Position[]>([]);
  private leaveTypes$ = new BehaviorSubject<LeaveType[]>([]);

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
  // Public Observables
  // ========================================

  /**
   * Get departments observable with caching
   * Lazy loads on first call, then returns cached data
   */
  getDepartments$(): Observable<Department[]> {
    if (!this.departmentsLoaded && !this.departmentsLoading) {
      this.loadDepartments();
    }
    return this.departments$.asObservable();
  }

  /**
   * Get positions observable with caching
   * Lazy loads on first call, then returns cached data
   */
  getPositions$(): Observable<Position[]> {
    if (!this.positionsLoaded && !this.positionsLoading) {
      this.loadPositions();
    }
    return this.positions$.asObservable();
  }

  /**
   * Get leave types observable with caching
   * Lazy loads on first call, then returns cached data
   */
  getLeaveTypes$(): Observable<LeaveType[]> {
    if (!this.leaveTypesLoaded && !this.leaveTypesLoading) {
      this.loadLeaveTypes();
    }
    return this.leaveTypes$.asObservable();
  }

  // ========================================
  // Private Load Methods
  // ========================================

  private loadDepartments(): void {
    this.departmentsLoading = true;
    this.logger.debug('Loading departments from API');

    this.deptService.getDepartments().pipe(
      tap(data => {
        this.departmentsSignal.set(data);
        this.departments$.next(data);
        this.departmentsLoaded = true;
        this.departmentsLoading = false;
        this.logger.debug(`Loaded ${data.length} departments`);
      })
    ).subscribe({
      error: (err) => {
        this.logger.error('Failed to load departments', err);
        this.departmentsLoading = false;
        // Keep empty array in BehaviorSubject
      }
    });
  }

  private loadPositions(): void {
    this.positionsLoading = true;
    this.logger.debug('Loading positions from API');

    this.posService.getPositions().pipe(
      tap(data => {
        this.positionsSignal.set(data);
        this.positions$.next(data);
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

  private loadLeaveTypes(): void {
    this.leaveTypesLoading = true;
    this.logger.debug('Loading leave types from API');

    this.leaveTypeService.getAll().pipe(
      tap(data => {
        this.leaveTypesSignal.set(data);
        this.leaveTypes$.next(data);
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
    this.loadDepartments();
  }

  /**
   * Refresh positions cache
   * Call this after creating/updating/deleting a position
   */
  refreshPositions(): void {
    this.logger.debug('Refreshing positions cache');
    this.positionsLoaded = false;
    this.loadPositions();
  }

  /**
   * Refresh leave types cache
   * Call this after creating/updating/deleting a leave type
   */
  refreshLeaveTypes(): void {
    this.logger.debug('Refreshing leave types cache');
    this.leaveTypesLoaded = false;
    this.loadLeaveTypes();
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
    return this.departments$.value.find(d => d.id === id);
  }

  /**
   * Get position by ID from cache
   * Returns undefined if not found or not loaded yet
   */
  getPositionById(id: string): Position | undefined {
    return this.positions$.value.find(p => p.id === id);
  }

  /**
   * Get leave type by ID from cache
   * Returns undefined if not found or not loaded yet
   */
  getLeaveTypeById(id: string): LeaveType | undefined {
    return this.leaveTypes$.value.find(lt => lt.id === id);
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
