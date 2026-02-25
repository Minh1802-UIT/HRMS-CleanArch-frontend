/**
 * DTO representing a leave allocation record returned from the API.
 */
export interface LeaveAllocationDto {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  /** Allocation year, e.g. "2024" */
  year: string;
  totalDays: number;
  usedDays: number;
  /** Days accrued so far in a progressive-accrual scheme */
  accruedDays?: number;
  pendingDays: number;
  remainingDays: number;
  lastAccrualMonth?: string;
}
