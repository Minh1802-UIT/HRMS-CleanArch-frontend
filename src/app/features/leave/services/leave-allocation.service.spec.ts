import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LeaveAllocationService } from './leave-allocation.service';
import { LeaveAllocationDto } from '../models/leave-allocation.model';
import { LoggerService } from '@core/services/logger.service';
import { environment } from '../../../../environments/environment';
import { PaginationParams } from '@core/models/user.model';
import { PagedResult } from '@core/models/api-response';

function makeAllocation(overrides: Partial<LeaveAllocationDto> = {}): LeaveAllocationDto {
  return {
    id: 'alloc-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    leaveTypeName: 'Annual Leave',
    year: '2024',
    totalDays: 12,
    usedDays: 3,
    pendingDays: 0,
    remainingDays: 9,
    ...overrides
  };
}

function makePagedAllocation(items: LeaveAllocationDto[]): PagedResult<LeaveAllocationDto> {
  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize: 10,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false
  };
}

describe('LeaveAllocationService', () => {
  let service: LeaveAllocationService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  const apiUrl = `${environment.apiUrl}/leave-allocations`;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LeaveAllocationService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(LeaveAllocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // initializeAllocation
  // --------------------------------------------------
  describe('initializeAllocation()', () => {
    it('should POST /leave-allocations/initialize/:year with employeeId query param', () => {
      let msg: string | undefined;
      service.initializeAllocation('emp-1', 2024).subscribe(r => msg = r);

      const req = httpMock.expectOne(`${apiUrl}/initialize/2024?employeeId=emp-1`);
      expect(req.request.method).toBe('POST');
      req.flush({ succeeded: true, message: 'Initialized successfully', data: 'ok' });

      expect(msg).toBe('Initialized successfully');
    });

    it('should return fallback message when response.message is empty', () => {
      let msg: string | undefined;
      service.initializeAllocation('emp-1', 2024).subscribe(r => msg = r);

      const req = httpMock.expectOne(`${apiUrl}/initialize/2024?employeeId=emp-1`);
      req.flush({ succeeded: true, message: '', data: null });

      expect(msg).toBe('Initialized successfully');
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.initializeAllocation('emp-1', 2024).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/initialize/2024?employeeId=emp-1`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // getAllAllocations
  // --------------------------------------------------
  describe('getAllAllocations()', () => {
    it('should POST /leave-allocations/list with pagination and keyword', () => {
      const pagination: PaginationParams = { pageNumber: 1, pageSize: 10 };
      const items = [makeAllocation()];
      let result: PagedResult<LeaveAllocationDto> | undefined;

      service.getAllAllocations(pagination, 'alice').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/list`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pageNumber: 1, pageSize: 10, keyword: 'alice' });
      req.flush({ succeeded: true, message: '', data: makePagedAllocation(items) });

      expect(result!.items.length).toBe(1);
      expect(result!.items[0].leaveTypeName).toBe('Annual Leave');
    });

    it('should POST with empty keyword as default', () => {
      service.getAllAllocations({ pageNumber: 1, pageSize: 5 }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/list`);
      expect(req.request.body).toEqual({ pageNumber: 1, pageSize: 5, keyword: '' });
      req.flush({ succeeded: true, message: '', data: makePagedAllocation([]) });
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getAllAllocations({ pageNumber: 1, pageSize: 10 }).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/list`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // getBalance
  // --------------------------------------------------
  describe('getBalance()', () => {
    it('should GET /leave-allocations/employee/:id and filter by leaveTypeId', () => {
      const allocations = [
        makeAllocation({ leaveTypeId: 'lt-annual', remainingDays: 9 }),
        makeAllocation({ id: 'alloc-2', leaveTypeId: 'lt-sick', remainingDays: 5 })
      ];

      let result: LeaveAllocationDto | undefined;
      service.getBalance('emp-1', 'lt-annual', 2024).subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: allocations });

      expect(result).toBeDefined();
      expect(result!.leaveTypeId).toBe('lt-annual');
      expect(result!.remainingDays).toBe(9);
    });

    it('should return undefined when leaveTypeId not found', () => {
      let result: LeaveAllocationDto | undefined = makeAllocation();
      service.getBalance('emp-1', 'lt-nonexistent', 2024).subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      req.flush({ succeeded: true, message: '', data: [makeAllocation({ leaveTypeId: 'lt-annual' })] });

      expect(result).toBeUndefined();
    });

    it('should return undefined when data is not an array', () => {
      let result: LeaveAllocationDto | undefined = makeAllocation();
      service.getBalance('emp-1', 'lt-annual', 2024).subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toBeUndefined();
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getBalance('emp-1', 'lt-annual', 2024).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // getAllocationsForEmployee
  // --------------------------------------------------
  describe('getAllocationsForEmployee()', () => {
    it('should GET /leave-allocations/employee/:id and return full array', () => {
      const allocations = [
        makeAllocation({ leaveTypeId: 'lt-annual' }),
        makeAllocation({ id: 'alloc-2', leaveTypeId: 'lt-sick' })
      ];

      let result: LeaveAllocationDto[] = [];
      service.getAllocationsForEmployee('emp-1').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: allocations });

      expect(result.length).toBe(2);
      expect(result[0].leaveTypeId).toBe('lt-annual');
    });

    it('should return empty array when data is null', () => {
      let result: LeaveAllocationDto[] = [makeAllocation()];
      service.getAllocationsForEmployee('emp-1').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toEqual([]);
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getAllocationsForEmployee('emp-1').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/employee/emp-1`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
    });
  });
});
