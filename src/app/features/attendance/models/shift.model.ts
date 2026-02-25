export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakStartTime?: string;
  breakEndTime?: string;
  gracePeriodMinutes: number;
  isOvernight: boolean;
  standardWorkingHours: number;
  isActive: boolean;
  timeRange?: string; // For lookup/display
}

export interface CreateShift {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  gracePeriodMinutes: number;
  isOvernight: boolean;
  description?: string;
}

export interface UpdateShift extends CreateShift {
  id: string;
  isActive: boolean;
}
