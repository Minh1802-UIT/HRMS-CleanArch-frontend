export enum AttendanceStatus {
  Absent = 'Absent',
  Present = 'Present',
  Late = 'Late',
  EarlyLeave = 'EarlyLeave',
  Leave = 'Leave',
  Holiday = 'Holiday'
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    avatar: string;
  };
  checkIn: string;
  checkOut: string;
  workingHours: number;
  status: AttendanceStatus;
}

export interface DailyStats {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}
