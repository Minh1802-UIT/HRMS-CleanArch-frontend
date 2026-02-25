export interface Payroll {
  id: string;
  employeeCode: string;
  employeeName: string;
  month: string;
  grossIncome: number;
  baseSalary: number;
  allowances: number;
  actualWorkingDays: number;
  totalDeductions: number;
  finalNetSalary: number;
  status: string;
  paidDate?: string | Date;
  // Deduction breakdown (returned from API)
  socialInsurance?: number;
  healthInsurance?: number;
  unemploymentInsurance?: number;
  personalIncomeTax?: number;
}

// Frontend UI model extending backend data with display info
export interface PayrollRecord extends Payroll {
  avatar?: string;
  displayNetSalary?: number;
  displayWorkingHours?: number;
}

// ─── NEW-7: Annual PIT Tax Report types ───────────────────────────────────────

export interface MonthlyTaxSummary {
  month: string;               // '01-2025' … '12-2025'
  grossIncome: number;
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  taxableIncome: number;
  personalIncomeTax: number;
  finalNetSalary: number;      // matches backend FinalNetSalary
}

export interface EmployeeTaxSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  year?: number;
  monthlySummaries: MonthlyTaxSummary[];
  totalGrossIncome: number;
  totalSocialInsurance: number;
  totalHealthInsurance: number;
  totalUnemploymentInsurance: number;
  totalPersonalIncomeTax: number;
  totalNetSalary: number;
  /** UI helper: whether the monthly row is expanded */
  expanded?: boolean;
}

export interface AnnualTaxReport {
  year: number;
  totalEmployees?: number;
  employees: EmployeeTaxSummary[];
  companyTotalGross: number;
  companyTotalPIT: number;
  companyTotalNet: number;
  companyTotalInsurance: number;
}

