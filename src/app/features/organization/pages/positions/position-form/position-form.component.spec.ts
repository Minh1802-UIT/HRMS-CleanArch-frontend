import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositionFormComponent } from './position-form.component';
import { PositionService } from '@features/organization/services/position.service';
import { DepartmentService } from '@features/organization/services/department.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';

describe('PositionFormComponent', () => {
  let component: PositionFormComponent;
  let fixture: ComponentFixture<PositionFormComponent>;

  beforeEach(async () => {
    const mockPositionService = jasmine.createSpyObj('PositionService', ['getPositions', 'getPosition', 'createPosition', 'updatePosition']);
    const mockDepartmentService = jasmine.createSpyObj('DepartmentService', ['getDepartments']);
    const mockToastService = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showInfo']);

    mockPositionService.getPositions.and.returnValue(of([]));
    mockDepartmentService.getDepartments.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PositionFormComponent],
      providers: [
        { provide: PositionService, useValue: mockPositionService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        { provide: ToastService, useValue: mockToastService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PositionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
