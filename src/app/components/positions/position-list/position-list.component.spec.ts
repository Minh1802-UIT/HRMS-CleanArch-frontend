import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositionListComponent } from './position-list.component';
import { PositionService } from '@features/organization/services/position.service';
import { DepartmentService } from '@features/organization/services/department.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';

describe('PositionListComponent', () => {
  let component: PositionListComponent;
  let fixture: ComponentFixture<PositionListComponent>;

  beforeEach(async () => {
    const mockPositionService = jasmine.createSpyObj('PositionService', ['getPositions', 'getPositionTree', 'deletePosition']);
    const mockDepartmentService = jasmine.createSpyObj('DepartmentService', ['getDepartments']);
    const mockToastService = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showInfo']);

    mockPositionService.getPositions.and.returnValue(of([]));
    mockPositionService.getPositionTree.and.returnValue(of([]));
    mockDepartmentService.getDepartments.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PositionListComponent],
      providers: [
        { provide: PositionService, useValue: mockPositionService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        { provide: ToastService, useValue: mockToastService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PositionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
