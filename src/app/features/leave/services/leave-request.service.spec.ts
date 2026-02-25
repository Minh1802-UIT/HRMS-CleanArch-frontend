import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequest } from '../models/leave-request.model';
import { LoggerService } from '@core/services/logger.service';
import { environment } from '../../../../environments/environment';

/** Build a raw API item (as MongoDB/backend returns it) */
function makeApiItem(overrides: Record<string, any> = {}) {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    employeeCode: 'EMP001',
    employeeName: 'Alice Smith',
    avatarUrl: null,
    leaveType: 'Annual',
    fromDate: '2024-06-01',
    toDate: '2024-06-05',
    totalDays: 5,
    reason: 'Vacation',
    status: 'Pending',
    createdAt: '2024-05-20T10:00:00',
    ...overrides
  };
}

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  const apiUrl = `${environment.apiUrl}/leaves`;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LeaveRequestService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(LeaveRequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // getLeaveHistory
  // --------------------------------------------------
  describe('getLeaveHistory()', () => {
    it('should GET /leaves/me and map items to LeaveRequest[]', () => {
      const rawItems = [makeApiItem(), makeApiItem({ id: 'lr-2', leaveType: 'Sick' })];
      let result: LeaveRequest[] = [];

      service.getLeaveHistory().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: rawItems });

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('lr-1');
      expect(result[0].type).toBe('Annual');
      expect(result[0].employeeName).toBe('Alice Smith');
      expect(result[0].days).toBe(5);
      expect(result[0].status).toBe('Pending');
    });

    it('should map fromDate → startDate and toDate → endDate as Date objects', () => {
      let result: LeaveRequest[] = [];
      service.getLeaveHistory().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush({ succeeded: true, message: '', data: [makeApiItem()] });

      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].endDate).toBeInstanceOf(Date);
    });

    it('should return empty array on HTTP error', () => {
      let result: LeaveRequest[] = [{ id: 'placeholder' } as LeaveRequest];
      service.getLeaveHistory().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(result).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalled();
    });

    it('should return empty array when data is null', () => {
      let result: LeaveRequest[] = [{ id: 'placeholder' } as LeaveRequest];
      service.getLeaveHistory().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------
  // getAllRequests
  // --------------------------------------------------
  describe('getAllRequests()', () => {
    it('should POST /leaves/list with empty body and return mapped LeaveRequest[]', () => {
      const rawItems = [makeApiItem({ status: 'Approved' })];
      let result: LeaveRequest[] = [];

      service.getAllRequests().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/list`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ succeeded: true, message: '', data: { items: rawItems, totalCount: 1, pageNumber: 1, pageSize: 10 } });

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('Approved');
    });

    it('should return empty array on HTTP error', () => {
      let result: LeaveRequest[] = [{ id: 'x' } as LeaveRequest];
      service.getAllRequests().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/list`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      expect(result).toEqual([]);
    });

    it('should return empty array when data.items is null', () => {
      let result: LeaveRequest[] = [{ id: 'x' } as LeaveRequest];
      service.getAllRequests().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/list`);
      req.flush({ succeeded: true, message: '', data: { items: null } });

      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------
  // submitRequest
  // --------------------------------------------------
  describe('submitRequest()', () => {
    it('should POST /leaves with mapped DTO and return succeeded flag', () => {
      const request = {
        employeeId: 'emp-1',
        employeeCode: 'EMP001',
        employeeName: 'Alice',
        avatarUrl: undefined,
        type: 'Annual',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-05'),
        days: 5,
        reason: 'Holiday'
      } as Omit<LeaveRequest, 'id' | 'status' | 'requestDate'>;

      let succeeded: boolean | undefined;
      service.submitRequest(request).subscribe(r => succeeded = r);

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body['LeaveType']).toBe('Annual');
      expect(req.request.body['Reason']).toBe('Holiday');
      req.flush({ succeeded: true, message: 'Created', data: null });

      expect(succeeded).toBeTrue();
    });

    it('should return false when succeeded is false', () => {
      let succeeded: boolean | undefined;
      service.submitRequest({
        type: 'Sick',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Ill',
        employeeId: 'emp-1',
        employeeCode: 'EMP001',
        employeeName: 'Alice',
        days: 1,
        avatarUrl: undefined
      } as Omit<LeaveRequest, 'id' | 'status' | 'requestDate'>).subscribe(r => succeeded = r);

      const req = httpMock.expectOne(apiUrl);
      req.flush({ succeeded: false, message: 'Insufficient balance', data: null });
      expect(succeeded).toBeFalse();
    });
  });

  // --------------------------------------------------
  // approveRequest
  // --------------------------------------------------
  describe('approveRequest()', () => {
    it('should PUT /leaves/:id/review with Approved status', () => {
      let result: boolean | undefined;
      service.approveRequest('lr-1', 'Looks good').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/lr-1/review`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body['status']).toBe('Approved');
      expect(req.request.body['managerComment']).toBe('Looks good');
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toBeTrue();
    });

    it('should use default comment when none provided', () => {
      service.approveRequest('lr-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/lr-1/review`);
      expect(req.request.body['managerComment']).toBe('Approved via UI');
      req.flush({ succeeded: true, message: '', data: null });
    });

    it('should return false on HTTP error', () => {
      let result: boolean | undefined;
      service.approveRequest('lr-1').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/lr-1/review`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      expect(result).toBeFalse();
    });
  });

  // --------------------------------------------------
  // rejectRequest
  // --------------------------------------------------
  describe('rejectRequest()', () => {
    it('should PUT /leaves/:id/review with Rejected status', () => {
      let result: boolean | undefined;
      service.rejectRequest('lr-1', 'Policy violation').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/lr-1/review`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body['status']).toBe('Rejected');
      expect(req.request.body['managerComment']).toBe('Policy violation');
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toBeTrue();
    });

    it('should use default comment when none provided', () => {
      service.rejectRequest('lr-2').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/lr-2/review`);
      expect(req.request.body['managerComment']).toBe('Rejected via UI');
      req.flush({ succeeded: true, message: '', data: null });
    });

    it('should return false on HTTP error', () => {
      let result: boolean | undefined;
      service.rejectRequest('lr-1').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/lr-1/review`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(result).toBeFalse();
    });
  });
});
