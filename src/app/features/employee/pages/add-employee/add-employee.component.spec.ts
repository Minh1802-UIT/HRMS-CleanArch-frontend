import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddEmployeeComponent } from './add-employee.component';
import { EmployeeService } from '@features/employee/services/employee.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { ShiftService } from '@features/attendance/services/shift.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { UploadService } from '@features/employee/services/upload.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('AddEmployeeComponent', () => {
  let component: AddEmployeeComponent;
  let fixture: ComponentFixture<AddEmployeeComponent>;

  beforeEach(async () => {
    const mockEmployeeService = jasmine.createSpyObj('EmployeeService', ['getEmployees', 'getEmployee', 'getEmployeeById', 'createEmployee', 'updateEmployee', 'addEmployee', 'getLookup']);
    const mockMasterDataService = jasmine.createSpyObj('MasterDataService', ['getDepartments$', 'getPositions$', 'loadAll']);
    const mockShiftService = jasmine.createSpyObj('ShiftService', ['getShifts']);
    const mockToastService = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showInfo']);
    const mockLogger = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info', 'debug']);
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const mockUploadService = jasmine.createSpyObj('UploadService', ['uploadFile', 'uploadEmployeeAvatar', 'getFileUrl']);
    mockUploadService.getFileUrl.and.callFake((url: string) => url || '');

    mockMasterDataService.getDepartments$.and.returnValue(of([]));
    mockMasterDataService.getPositions$.and.returnValue(of([]));
    mockShiftService.getShifts.and.returnValue(of([]));
    mockEmployeeService.getEmployees.and.returnValue(of({ items: [], totalCount: 0 }));
    mockEmployeeService.getLookup.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AddEmployeeComponent],
      providers: [
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: MasterDataService, useValue: mockMasterDataService },
        { provide: ShiftService, useValue: mockShiftService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Router, useValue: mockRouter },
        { provide: UploadService, useValue: mockUploadService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddEmployeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
