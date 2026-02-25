import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DepartmentService } from './department.service';
import { Department } from '../models/department.model';
import { LoggerService } from '@core/services/logger.service';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '@core/models/api-response';

function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Software Engineering',
    status: 'Active',
    ...overrides
  };
}

function makePagedResult(items: Department[]): PagedResult<Department> {
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

describe('DepartmentService', () => {
  let service: DepartmentService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  const apiUrl = `${environment.apiUrl}/departments`;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DepartmentService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(DepartmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // getDepartments
  // --------------------------------------------------
  describe('getDepartments()', () => {
    it('should GET /departments and return Department[]', () => {
      const depts = [makeDepartment(), makeDepartment({ id: 'dept-2', name: 'HR', code: 'HR' })];
      let result: Department[] = [];

      service.getDepartments().subscribe(r => result = r);

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: makePagedResult(depts) });

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Engineering');
      expect(result[1].name).toBe('HR');
    });

    it('should return empty array when data is null', () => {
      let result: Department[] = [makeDepartment()];
      service.getDepartments().subscribe(r => result = r);

      const req = httpMock.expectOne(apiUrl);
      req.flush({ succeeded: true, message: '', data: null });

      expect(result).toEqual([]);
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.getDepartments().subscribe({ error: err => error = err });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // getDepartment
  // --------------------------------------------------
  describe('getDepartment()', () => {
    it('should GET /departments/:id and return single Department', () => {
      const dept = makeDepartment({ id: 'dept-42' });
      let result: Department | undefined;

      service.getDepartment('dept-42').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/dept-42`);
      expect(req.request.method).toBe('GET');
      req.flush({ succeeded: true, message: '', data: dept });

      expect(result!.id).toBe('dept-42');
      expect(result!.name).toBe('Engineering');
    });

    it('should propagate error when department not found', () => {
      let error: unknown;
      service.getDepartment('bad-id').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/bad-id`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // createDepartment
  // --------------------------------------------------
  describe('createDepartment()', () => {
    it('should POST /departments and return created Department', () => {
      const dto = makeDepartment({ id: undefined });
      const created = makeDepartment({ id: 'dept-new' });
      let result: Department | undefined;

      service.createDepartment(dto).subscribe(r => result = r);

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ succeeded: true, message: '', data: created });

      expect(result!.id).toBe('dept-new');
    });

    it('should propagate error on validation failure', () => {
      let error: unknown;
      service.createDepartment({ name: '', code: '' }).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Validation error', { status: 400, statusText: 'Bad Request' });

      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // updateDepartment
  // --------------------------------------------------
  describe('updateDepartment()', () => {
    it('should PUT /departments/:id with updated data', () => {
      const updated = makeDepartment({ name: 'Engineering Updated' });
      let result: Department | undefined;

      service.updateDepartment('dept-1', updated).subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/dept-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updated);
      req.flush({ succeeded: true, message: '', data: updated });
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.updateDepartment('dept-1', makeDepartment()).subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/dept-1`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // deleteDepartment
  // --------------------------------------------------
  describe('deleteDepartment()', () => {
    it('should DELETE /departments/:id', () => {
      let result: unknown;
      service.deleteDepartment('dept-1').subscribe(r => result = r);

      const req = httpMock.expectOne(`${apiUrl}/dept-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ succeeded: true, message: 'Deleted', data: null });
    });

    it('should propagate error on HTTP failure', () => {
      let error: unknown;
      service.deleteDepartment('dept-1').subscribe({ error: err => error = err });

      const req = httpMock.expectOne(`${apiUrl}/dept-1`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
    });
  });
});
