import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EmployeeListComponent } from './employee-list.component';
import { EmployeeService, Employee } from '@features/employee/services/employee.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { UploadService } from '@features/employee/services/upload.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PagedResult } from '@core/models/api-response';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

const mockEmployee: Employee = {
  id: 'emp-1',
  employeeCode: 'EMP001',
  fullName: 'Nguyen Van A',
  email: 'a@hr.com',
  phoneNumber: '0900000001',
  departmentName: 'Engineering',
  positionName: 'Developer',
  jobDetails: { departmentId: 'dept-1', positionId: 'pos-1', status: 'Active' } as unknown as Employee['jobDetails'],
  version: 0
} as unknown as Employee;

const mockPagedResult: PagedResult<Employee> = {
  items: [mockEmployee],
  totalCount: 1,
  totalPages: 1,
  pageNumber: 1,
  pageSize: 10,
  hasNext: false,
  hasPrevious: false
};

describe('EmployeeListComponent', () => {
  let component: EmployeeListComponent;
  let fixture: ComponentFixture<EmployeeListComponent>;
  let mockEmployeeService: jasmine.SpyObj<EmployeeService>;
  let mockMasterDataService: jasmine.SpyObj<MasterDataService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockLogger: jasmine.SpyObj<LoggerService>;
  let mockUploadService: jasmine.SpyObj<UploadService>;

  beforeEach(async () => {
    mockEmployeeService = jasmine.createSpyObj('EmployeeService', ['getEmployees', 'deleteEmployee']);
    mockMasterDataService = jasmine.createSpyObj('MasterDataService', ['getDepartments$', 'getPositions$']);
    mockToastService = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showInfo']);
    mockLogger = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info', 'debug']);
    mockUploadService = jasmine.createSpyObj('UploadService', ['uploadEmployeeAvatar', 'getFileUrl']);
    mockUploadService.getFileUrl.and.callFake((url: string) => url || '');

    mockEmployeeService.getEmployees.and.returnValue(of(mockPagedResult));
    mockMasterDataService.getDepartments$.and.returnValue(of([]));
    mockMasterDataService.getPositions$.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
      providers: [
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: MasterDataService, useValue: mockMasterDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: UploadService, useValue: mockUploadService },
        MessageService,
        provideRouter([]),
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load employees on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith({ pageSize: 10, pageNumber: 1 });
    expect(component.employees.length).toBe(1);
    expect(component.employees[0].id).toBe('emp-1');
  }));

  it('should set totalItems from paged response', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.totalItems).toBe(1);
    expect(component.totalPagesCount).toBe(1);
  }));

  it('should set loading to false after employees load', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.loading).toBeFalse();
  }));

  it('should log error and show toast when loadEmployees fails', fakeAsync(() => {
    mockEmployeeService.getEmployees.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    tick();

    expect(mockLogger.error).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  }));

  it('should open add drawer with no selectedEmployeeId', () => {
    component.onAddEmployee();
    expect(component.showEditDrawer).toBeTrue();
    expect(component.selectedEmployeeId).toBeNull();
  });

  it('should close edit drawer and clear selectedEmployeeId', () => {
    component.showEditDrawer = true;
    component.selectedEmployeeId = 'emp-1';
    component.closeEditDrawer();

    expect(component.showEditDrawer).toBeFalse();
    expect(component.selectedEmployeeId).toBeNull();
  });

  it('getDepartmentName should return departmentName from DTO', () => {
    const name = component.getDepartmentName(mockEmployee);
    expect(name).toBe('Engineering');
  });

  it('getDepartmentName should look up deptMap when DTO has no name', () => {
    component.deptMap = { 'dept-1': 'IT Department' };
    const emp = { ...mockEmployee, departmentName: undefined, DepartmentName: undefined } as unknown as Employee;
    const name = component.getDepartmentName(emp);
    expect(name).toBe('IT Department');
  });

  it('getDepartmentName should return dash as fallback', () => {
    const emp = { ...mockEmployee, departmentName: undefined, DepartmentName: undefined, jobDetails: { departmentId: 'unknown' } } as unknown as Employee;
    const name = component.getDepartmentName(emp);
    expect(name).toBe('-');
  });

  it('should reload employees after onEmployeeSaved', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const callCount = mockEmployeeService.getEmployees.calls.count();

    component.showEditDrawer = true;
    component.onEmployeeSaved();
    tick();

    expect(component.showEditDrawer).toBeFalse();
    expect(mockEmployeeService.getEmployees.calls.count()).toBe(callCount + 1);
  }));

  it('should clean up subscriptions on destroy', () => {
    fixture.detectChanges();
    expect(() => fixture.destroy()).not.toThrow();
  });
});
