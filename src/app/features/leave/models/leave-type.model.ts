export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  defaultDaysPerYear: number;
  isAccrual: boolean;
}
