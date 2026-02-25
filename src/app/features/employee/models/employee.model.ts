export enum EmployeeStatus {
  Probation = 'Probation',
  Active = 'Active',
  Resigned = 'Resigned',
  Terminated = 'Terminated'
}

export interface Employee {
  id: string; // Mapped from _id or Id
  avatarUrl?: string;
  fullName: string;
  employeeCode: string;
  email: string;
  version: number;

  // Flattened properties from EmployeeListDto (Backend)
  departmentName?: string;
  positionName?: string;
  status?: string;

  // PascalCase aliases for robustness
  DepartmentName?: string;
  PositionName?: string;
  Status?: string;

  // Flattened contact/job fields sometimes returned directly from API
  phoneNumber?: string;
  phone?: string;
  employmentType?: string;
  EmploymentType?: string;
  contactInfo?: { phone?: string };

  // Nested Objects matching Backend DTO (camelCase)
  personalInfo: {
    phoneNumber: string;
    dateOfBirth: Date;
    gender: string;
    address: string;
    identityCard: string;
    maritalStatus?: string;
    nationality?: string;
    hometown?: string;
    country?: string;
    city?: string;
    postalCode?: string;
    dependentCount?: number;
  };

  jobDetails?: {
    departmentId: string;
    positionId: string;
    managerId: string;
    shiftId?: string;
    joinDate: Date;
    status: EmployeeStatus;
    resumeUrl?: string;
    contractUrl?: string;
    probationEndDate?: Date;
    employmentType?: string;
  };

  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    insuranceCode?: string;
    taxCode?: string;
  };
}
