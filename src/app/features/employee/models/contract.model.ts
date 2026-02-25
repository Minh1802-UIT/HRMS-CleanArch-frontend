export enum ContractStatus {
  Active = 'Active',
  Expired = 'Expired',
  Terminated = 'Terminated',
  Draft = 'Draft'
}

export enum ContractType {
  FixedTerm = 'Fixed-Term',
  Indefinite = 'Indefinite'
}

export interface SalaryComponents {
  basicSalary: number;
  transportAllowance: number;
  lunchAllowance: number;
  otherAllowance: number;
}

export interface Contract {
  id?: string;
  employeeId: string;
  contractCode: string;
  type: ContractType;
  startDate: Date;
  endDate?: Date;
  salary: SalaryComponents;
  status: ContractStatus;
  note?: string;
  fileUrl?: string;
}
