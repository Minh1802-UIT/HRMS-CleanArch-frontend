export enum LeaveStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

export interface LeaveRequest {
  id: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  avatarUrl?: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  requestDate: Date;
}
