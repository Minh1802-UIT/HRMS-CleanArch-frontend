import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { LoggerService } from '@core/services/logger.service';
import { environment } from '../../../../environments/environment';
import { Employee } from '../models/employee.model';
import { OrgNode } from '../models/org-node.model';
import { PagedResult } from '@core/models/api-response';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeCode: 'EMP001',
    fullName: 'Alice Smith',
    department: 'Engineering',
    position: 'Developer',
    email: 'alice@example.com',
    status: 'Active',
    ...overrides
  } as Employee;
}

function makePagedResult(items: Employee[]): PagedResult<Employee> {
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

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  const apiUrl = `${environment.apiUrl}/employees`;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EmployeeService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // getEmployees
  // --------------------------------------------------
  describe('getEmployees()', () => {
    it('should POST to /employees/list and return PagedResult', () => {
      const employees = [makeEmployee()];
      const paged = makePagedResult(employees);

      service.getEmployees({ pageNumber: 1, pageSize: 10 }).subscribe(result => {
        expect(result.items.length).toBe(1);
        expect(result.items[0].fullName).toBe('Alice Smith');
      });

      const req = httpMock.expectOne(`${apiUrl}/list`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pageNumber: 1, pageSize: 10 });
      req.flush({ succeeded: true, message: '', data: paged });
    });

    it('should POST with default params when none provided', () => {
      service.getEmployees().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/list`);
      expect(req.request.body).toEqual({ pageSize: 10, pageNumber: 1 });
      req.flush({ succeeded: true, message: '', data: makePagedResult([]) });
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getEmployees().subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/list`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // getLookup
  // --------------------------------------------------
  describe('getLookup()', () => {
    it('should GET /employees/lookup without keyword when empty string', () => {
      const employees = [makeEmployee()];

      service.getLookup('').subscribe(result => {
        expect(result.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/lookup`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: employees });
    });

    it('should GET /employees/lookup with keyword param', () => {
      service.getLookup('alice').subscribe();

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/lookup` && r.params.get('keyword') === 'alice');
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: [] });
    });

    it('should return empty array if data is null', () => {
      let result: Employee[] = [makeEmployee()];
      service.getLookup().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/lookup`);
      req.flush({ succeeded: true, message: '', data: null });
      expect(result).toEqual([]);
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getLookup('test').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/lookup`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // getEmployeeById
  // --------------------------------------------------
  describe('getEmployeeById()', () => {
    it('should GET /employees/:id and return employee', () => {
      const employee = makeEmployee({ id: 'emp-42' });

      service.getEmployeeById('emp-42').subscribe(result => {
        expect(result.id).toBe('emp-42');
      });

      const req = httpMock.expectOne(`${apiUrl}/emp-42`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: employee });
    });

    it('should propagate error when employee not found', () => {
      let error: unknown;
      service.getEmployeeById('bad-id').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/bad-id`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // addEmployee
  // --------------------------------------------------
  describe('addEmployee()', () => {
    it('should POST /employees and return created employee', () => {
      const dto = { employeeCode: 'EMP002', fullName: 'Bob Jones', email: 'bob@example.com' } as Omit<Employee, 'id' | 'version'>;
      const created = makeEmployee({ id: 'emp-2', fullName: 'Bob Jones' });

      service.addEmployee(dto).subscribe(result => {
        expect(result.id).toBe('emp-2');
        expect(result.fullName).toBe('Bob Jones');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ succeeded: true, message: '', data: created });
    });

    it('should propagate error on add failure', () => {
      let error: unknown;
      service.addEmployee({ fullName: 'Test' } as unknown as Omit<Employee, 'id' | 'version'>).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // updateEmployee
  // --------------------------------------------------
  describe('updateEmployee()', () => {
    it('should PUT /employees/:id and return updated employee', () => {
      const updated = makeEmployee({ id: 'emp-1', fullName: 'Alice Updated' });

      service.updateEmployee('emp-1', { fullName: 'Alice Updated' }).subscribe(result => {
        expect(result.fullName).toBe('Alice Updated');
      });

      const req = httpMock.expectOne(`${apiUrl}/emp-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ fullName: 'Alice Updated' });
      req.flush({ succeeded: true, message: '', data: updated });
    });

    it('should propagate error on update failure', () => {
      let error: unknown;
      service.updateEmployee('emp-1', {}).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/emp-1`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // deleteEmployee
  // --------------------------------------------------
  describe('deleteEmployee()', () => {
    it('should DELETE /employees/:id and complete', () => {
      let completed = false;
      service.deleteEmployee('emp-1').subscribe({ complete: () => completed = true });

      const req = httpMock.expectOne(`${apiUrl}/emp-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ succeeded: true, message: 'Deleted', data: null });

      expect(completed).toBeTrue();
    });

    it('should propagate error on delete failure', () => {
      let error: unknown;
      service.deleteEmployee('emp-1').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/emp-1`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // getOrgChart
  // --------------------------------------------------
  describe('getOrgChart()', () => {
    it('should GET /employees/org-chart and return OrgNode array', () => {
      const nodes = [{ id: 'dept-1', name: 'Engineering', children: [] }];

      service.getOrgChart().subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Engineering');
      });

      const req = httpMock.expectOne(`${apiUrl}/org-chart`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: nodes });
    });

    it('should return empty array when data is null', () => {
      let result: OrgNode[] = [{ id: 'x' } as unknown as OrgNode];
      service.getOrgChart().subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/org-chart`);
      req.flush({ succeeded: true, message: '', data: null });
      expect(result).toEqual([]);
    });
  });
});
