import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Employee } from '@features/employee/models/employee.model';
import { Department } from '@features/organization/models/department.model';
import { Position } from '@features/organization/models/position.model';
import { ShiftService, Shift } from '@features/attendance/services/shift.service';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { MasterDataService } from '@features/organization/services/master-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import new step components
import { EmployeeWizardStepsComponent } from './wizard-steps/employee-wizard-steps.component';
import { EmployeeFormSuccessComponent } from './success/employee-form-success.component';
import { StepPersonalInfoComponent } from './steps/step-personal-info.component';
import { StepJobDetailsComponent } from './steps/step-job-details.component';
import { StepCompensationComponent } from './steps/step-compensation.component';
import { StepDocumentsComponent } from './steps/step-documents.component';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    EmployeeWizardStepsComponent,
    EmployeeFormSuccessComponent,
    StepPersonalInfoComponent,
    StepJobDetailsComponent,
    StepCompensationComponent,
    StepDocumentsComponent
],
  templateUrl: './add-employee.component.html',
  styleUrls: ['./add-employee.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddEmployeeComponent implements OnInit, OnDestroy {
  @Input() employeeId: string | null = null;
  @Input() initialStep: number = 1;
  @Output() close = new EventEmitter<void>();
  @Output() employeeAdded = new EventEmitter<void>();

  get isEditMode(): boolean {
    return !!this.employeeId;
  }

  currentStep = 1;
  employeeForm: FormGroup;
  loading = false;
  success = false;
  createdEmployeeId = '';
  createdEmployeeCode = '';
  createdEmployeeName = '';
  private destroy$ = new Subject<void>();
  
  departments: Department[] = [];
  positions: Position[] = [];
  shifts: Shift[] = [];
  managers: Employee[] = [];
  storedEmployeeCode: string = '';
  employeeVersion: number = 0;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private shiftService: ShiftService,
    private masterData: MasterDataService,
    public router: Router,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {
    this.employeeForm = this.fb.group({
      avatarUrl: [''],
      personalInfo: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
        dob: ['', Validators.required],
        gender: ['Male'],
        identityCard: ['', Validators.required],
        address: [''],
        maritalStatus: ['Single'],
        nationality: ['Vietnam'],
        hometown: [''],
        country: ['Vietnam'],
        city: [''],
        postalCode: ['']
      }),

      jobDetails: this.fb.group({
        department: ['', Validators.required], 
        position: ['', Validators.required], 
        manager: [''],
        shiftId: ['', Validators.required],
        workLocation: ['New York Office'],
        joinDate: [new Date().toISOString().split('T')[0], Validators.required],
        status: ['Active'],
        employmentType: ['Full-Time'],
        probationEndDate: [''],
        workLocationArrangement: ['On-site']
      }),

      compensation: this.fb.group({
        basicSalary: [0], 
        payFrequency: ['Monthly'], 
        bankName: ['', Validators.required],
        accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
        accountHolder: ['', Validators.required],
        swiftCode: [''],
        insuranceCode: [''],
        taxCode: ['']
      }),

      documents: this.fb.group({
        resumeUrl: [''],
        contractUrl: ['']
      })
    });
  }

  ngOnInit() {
    this.currentStep = this.initialStep;
    this.loadMasterData();
    if (this.isEditMode && this.employeeId) {
       this.loadEmployeeData(this.employeeId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployeeData(id: string) {
      this.loading = true;
      this.employeeService.getEmployeeById(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: (emp) => {
                this.storedEmployeeCode = emp.employeeCode;
                this.employeeVersion = emp.version || 0;
                this.patchForm(emp);
                this.loading = false;
                this.cdr.markForCheck();
            },
          error: (err) => {
              this.logger.error('Failed to load employee for edit', err);
              this.toastService.showError('Load Error', 'Failed to load employee details');
              this.loading = false;
              this.cdr.markForCheck();
          }
      });
  }
  
  patchForm(emp: Employee) {
      this.employeeForm.patchValue({
          personalInfo: {
              firstName: emp.fullName.split(' ')[0],
              lastName: emp.fullName.split(' ').slice(1).join(' '),
              email: emp.email,
              phone: emp.personalInfo?.phoneNumber,
              dob: emp.personalInfo?.dateOfBirth ? new Date(emp.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
              gender: emp.personalInfo?.gender,
              identityCard: emp.personalInfo?.identityCard,
              address: emp.personalInfo?.address,
              maritalStatus: emp.personalInfo?.maritalStatus,
              nationality: emp.personalInfo?.nationality,
              hometown: emp.personalInfo?.hometown,
              country: emp.personalInfo?.country,
              city: emp.personalInfo?.city,
              postalCode: emp.personalInfo?.postalCode
          },
          jobDetails: {
              department: emp.jobDetails?.departmentId,
              position: emp.jobDetails?.positionId,
              shiftId: emp.jobDetails?.shiftId,
              joinDate: emp.jobDetails?.joinDate ? new Date(emp.jobDetails.joinDate).toISOString().split('T')[0] : '',
              status: emp.jobDetails?.status,
              workLocation: 'New York Office', 
              employmentType: 'Full-Time' 
          },
          compensation: {
              basicSalary: 0,
              bankName: emp.bankDetails?.bankName,
              accountNumber: emp.bankDetails?.accountNumber,
              accountHolder: emp.bankDetails?.accountHolder,
              insuranceCode: emp.bankDetails?.insuranceCode,
              taxCode: emp.bankDetails?.taxCode
          }
      });
  }

  loadMasterData() {
    this.masterData.getDepartments$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Department[]) => {
        this.departments = data;
        this.cdr.markForCheck();
      },
      error: (err: any) => this.logger.error('Error loading departments', err)
    });

    this.masterData.getPositions$().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: Position[]) => {
          this.positions = data;
          this.cdr.markForCheck();
        },
        error: (err: any) => this.logger.error('Error loading positions', err)
    });

    this.shiftService.getShifts().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: Shift[]) => {
          this.shifts = data;
          this.cdr.markForCheck();
        },
        error: (err: any) => this.logger.error('Error loading shifts', err)
    });

    this.employeeService.getLookup().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: Employee[]) => {
          this.managers = data;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => this.logger.error('Error loading managers', err instanceof Error ? err : undefined)
    });
  }

  nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit() {
    if (this.employeeForm.invalid) {
      this.toastService.showWarn('Validation Error', 'Please fill in all required fields marked with *');
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.employeeForm.value;

    const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

    if (this.isEditMode && this.employeeId) {
       const updatePayload = {
           id: this.employeeId,
           avatarUrl: formValue.avatarUrl,
           fullName: `${formValue.personalInfo.firstName} ${formValue.personalInfo.lastName}`,
           email: formValue.personalInfo.email,
           
           personalInfo: {
               dateOfBirth: formatDate(formValue.personalInfo.dob),
               gender: formValue.personalInfo.gender,
               phoneNumber: formValue.personalInfo.phone,
               address: formValue.personalInfo.address,
               identityCard: formValue.personalInfo.identityCard
           },
           
           jobDetails: {
               departmentId: formValue.jobDetails.department,
               positionId: formValue.jobDetails.position,
               managerId: formValue.jobDetails.manager,
               shiftId: formValue.jobDetails.shiftId,
               joinDate: formatDate(formValue.jobDetails.joinDate),
               status: formValue.jobDetails.status,
               probationEndDate: formValue.jobDetails.probationEndDate ? formatDate(formValue.jobDetails.probationEndDate) : null
           },
           
           bankDetails: {
               bankName: formValue.compensation.bankName,
               accountNumber: formValue.compensation.accountNumber,
               accountHolder: formValue.compensation.accountHolder
           },
           version: this.employeeVersion
       };

       this.employeeService.updateEmployee(this.employeeId, updatePayload as unknown as Partial<Employee>).pipe(takeUntil(this.destroy$)).subscribe({
           next: () => {
               this.loading = false;
               this.success = true;
               this.createdEmployeeName = `${formValue.personalInfo.firstName} ${formValue.personalInfo.lastName}`;
               this.toastService.showSuccess('Updated', 'Employee updated successfully');
               this.employeeAdded.emit();
               this.cdr.markForCheck();
           },
           error: (err) => {
               this.logger.error('Employee update failed', err);
               this.toastService.showError('Update Failed', err.error?.message || 'Could not update employee');
               this.loading = false;
               this.cdr.markForCheck();
           }
       });

    } else {
        const generatedCode = `EMP-${Math.floor(Math.random() * 10000)}`;
        
        const createPayload = {
            employeeCode: generatedCode,
            avatarUrl: formValue.avatarUrl,
            fullName: `${formValue.personalInfo.firstName} ${formValue.personalInfo.lastName}`,
            email: formValue.personalInfo.email,
            
            personalInfo: {
                dateOfBirth: formatDate(formValue.personalInfo.dob),
                gender: formValue.personalInfo.gender,
                phoneNumber: formValue.personalInfo.phone,
                address: formValue.personalInfo.address,
                identityCard: formValue.personalInfo.identityCard,
                maritalStatus: formValue.personalInfo.maritalStatus,
                nationality: formValue.personalInfo.nationality,
                hometown: formValue.personalInfo.hometown,
                country: formValue.personalInfo.country,
                city: formValue.personalInfo.city,
                postalCode: formValue.personalInfo.postalCode
            },

            jobDetails: {
                departmentId: formValue.jobDetails.department,
                positionId: formValue.jobDetails.position,
                managerId: formValue.jobDetails.manager,
                shiftId: formValue.jobDetails.shiftId,
                joinDate: formatDate(formValue.jobDetails.joinDate),
                status: formValue.jobDetails.status,
                probationEndDate: formValue.jobDetails.probationEndDate ? formatDate(formValue.jobDetails.probationEndDate) : null
            },
            
            bankDetails: {
                bankName: formValue.compensation.bankName,
                accountNumber: formValue.compensation.accountNumber,
                accountHolder: formValue.compensation.accountHolder,
                insuranceCode: formValue.compensation.insuranceCode,
                taxCode: formValue.compensation.taxCode
            }
        };

        this.employeeService.addEmployee(createPayload as unknown as Omit<Employee, 'id' | 'version'>).pipe(takeUntil(this.destroy$)).subscribe({
        next: (emp) => {
            this.createdEmployeeId = emp.id;
            this.createdEmployeeCode = generatedCode;
            this.createdEmployeeName = `${formValue.personalInfo.firstName} ${formValue.personalInfo.lastName}`;

            this.loading = false;
            this.success = true;
            this.toastService.showSuccess('Created', 'New employee added successfully');
            this.employeeAdded.emit();
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.logger.error('Employee creation failed', err);
            this.toastService.showError('Creation Failed', err.error?.message || 'Could not create employee');
            this.loading = false;
            this.cdr.markForCheck();
        }
        });
    }
  }

  finish() {
    this.employeeAdded.emit();
  }

  onViewProfile() {
      if (this.isEditMode && this.employeeId) {
           this.router.navigate(['/employees', this.employeeId]);
      } else if (this.createdEmployeeId) {
           this.router.navigate(['/employees', this.createdEmployeeId]);
      }
      this.close.emit();
  }

  addAnother() {
      this.success = false;
      this.currentStep = 1;
      this.createdEmployeeName = '';
      this.employeeForm.reset();
      this.employeeForm.patchValue({
          jobDetails: { status: 'Active', joinDate: new Date().toISOString().split('T')[0] },
          personalInfo: { gender: 'Male' }
      });
  }

  getStepIndicatorClass(step: number): string {
    if (this.currentStep === step) {
      return 'bg-blue-600 text-white';
    } else if (this.currentStep > step) {
      return 'bg-blue-600 text-white';
    } else {
      return 'bg-gray-200 text-gray-500';
    }
  }

  isStepInvalid(step: number): boolean {
    switch (step) {
      case 1: return this.employeeForm.get('personalInfo')?.invalid ?? true;
      case 2: return this.employeeForm.get('jobDetails')?.invalid ?? true;
      case 3: return this.employeeForm.get('compensation')?.invalid ?? true;
      case 4: return this.employeeForm.get('documents')?.invalid ?? true;
      default: return true;
    }
  }
}
