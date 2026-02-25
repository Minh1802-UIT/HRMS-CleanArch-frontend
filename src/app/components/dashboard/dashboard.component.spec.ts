import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '@features/dashboard/services/dashboard.service';
import { AuditLogService } from '@features/system/services/audit-log.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { User } from '@core/models/user.model';
import { DashboardData } from '@features/dashboard/services/dashboard.service';
import { PagedResult } from '@core/models/api-response';
import { AuditLog } from '@features/system/models/audit-log.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockAuditLogService: jasmine.SpyObj<AuditLogService>;
  let mockLogger: jasmine.SpyObj<LoggerService>;
  let mockAuthService: { currentUser: BehaviorSubject<User | null> };

  const mockAdminUser = {
    id: 'user-1',
    username: 'admin',
    fullName: 'Admin User',
    email: 'admin@test.com',
    roles: ['Admin'],
    employeeId: 'emp-1'
  };

  const mockDashboardData = {
    summaryCards: [],
    recruitmentStats: { openPositions: 5, applicationsThisMonth: 20, interviewsScheduled: 8, offersExtended: 3 },
    recentJobs: [],
    ongoingProcesses: [],
    upcomingEvents: [],
    whoIsOnLeave: [],
    todayInterviews: [],
    recentHires: [],
    pendingRequests: [],
    analytics: null
  };

  beforeEach(async () => {
    mockDashboardService = jasmine.createSpyObj('DashboardService', ['getDashboardData']);
    mockAuditLogService = jasmine.createSpyObj('AuditLogService', ['getAuditLogs']);
    mockLogger = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info', 'debug']);
    mockAuthService = { currentUser: new BehaviorSubject<User | null>(null) };

    mockDashboardService.getDashboardData.and.returnValue(of(mockDashboardData as unknown as DashboardData));
    mockAuditLogService.getAuditLogs.and.returnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false } as PagedResult<AuditLog>));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: AuthService, useValue: mockAuthService },
        MessageService,
        provideRouter([]),
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should not load dashboard data when user is not Admin or HR', fakeAsync(() => {
    const regularUser = { ...mockAdminUser, roles: ['Employee'] };
    fixture.detectChanges();
    mockAuthService.currentUser.next(regularUser);
    tick();

    expect(mockDashboardService.getDashboardData).not.toHaveBeenCalled();
  }));

  it('should load dashboard data when Admin user logs in', fakeAsync(() => {
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();

    expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
  }));

  it('should load dashboard data only once even if user emits multiple times', fakeAsync(() => {
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();
    mockAuthService.currentUser.next({ ...mockAdminUser });
    tick();

    expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
  }));

  it('should load dashboard data for HR user', fakeAsync(() => {
    const hrUser = { ...mockAdminUser, roles: ['HR'] };
    fixture.detectChanges();
    mockAuthService.currentUser.next(hrUser);
    tick();

    expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
  }));

  it('should set userDisplayName from fullName', fakeAsync(() => {
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();

    expect(component.userDisplayName).toBe('Admin User');
  }));

  it('should fall back to username when fullName is absent', fakeAsync(() => {
    const userNoFullName = { ...mockAdminUser, fullName: undefined, username: 'admin_user' };
    fixture.detectChanges();
    mockAuthService.currentUser.next(userNoFullName);
    tick();

    expect(component.userDisplayName).toBe('admin_user');
  }));

  it('should set isLoading to false after data loads', fakeAsync(() => {
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();

    expect(component.isLoading).toBeFalse();
  }));

  it('should handle error from getDashboardData gracefully', fakeAsync(() => {
    mockDashboardService.getDashboardData.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();

    expect(mockLogger.error).toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  }));

  it('should clean up subscriptions on destroy', fakeAsync(() => {
    fixture.detectChanges();
    mockAuthService.currentUser.next(mockAdminUser);
    tick();

    fixture.destroy();
    // No error thrown after destroy = subscription cleaned up
    mockAuthService.currentUser.next({ ...mockAdminUser, fullName: 'Another User' });
    tick();

    // userDisplayName should not have changed after destroy
    expect(component.userDisplayName).toBe('Admin User');
  }));
});
