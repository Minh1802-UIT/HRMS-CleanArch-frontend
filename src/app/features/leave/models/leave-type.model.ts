export interface LeaveType {
  id: string;
  name: string;
  /** Enum category sent to backend: "Annual" | "Sick" | "Unpaid" */
  code: string;
  description?: string;
  defaultDays: number;
  isAccrual: boolean;
}
