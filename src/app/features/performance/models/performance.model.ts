export enum PerformanceReviewStatus {
  Draft = 0,
  Pending = 1,
  Completed = 2,
  Acknowledged = 3
}

export enum PerformanceGoalStatus {
  InProgress = 0,
  Completed = 1,
  Cancelled = 2,
  Overdue = 3
}

export enum PIPStatus {
  Draft = 0,
  InProgress = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  employeeName: string;
  reviewerName: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  overallScore: number;
  notes: string;
  status: PerformanceReviewStatus;
  createdAt: string | Date;
}

export interface PerformanceGoal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  targetDate: string | Date;
  progress: number;
  status: PerformanceGoalStatus;
  createdAt: string | Date;
}

// ===== PIP Interfaces =====

export interface PIPObjective {
  description: string;
  successCriteria: string;
  progress: number;
  targetDate?: string | Date;
}

export interface PIPMeeting {
  id: string;
  meetingDate: string | Date;
  notes: string;
  conductedBy: string;
  createdAt: string | Date;
}

export interface PIP {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  title: string;
  description: string;
  status: PIPStatus;
  startDate: string | Date;
  endDate: string | Date;
  overallProgress: number;
  objectives: PIPObjective[];
  meetings: PIPMeeting[];
  outcomeNotes?: string;
  createdAt: string | Date;
}

export interface PIPCreatePayload {
  employeeId: string;
  managerId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  objectives: PIPObjective[];
}

export interface PIPUpdateProgressPayload {
  objectiveIndex: number;
  progress: number;
}

export interface PIPCompletePayload {
  outcomeNotes: string;
  successful: boolean;
}

// ===== Analytics Interfaces =====

export class MonthlyGoalStats {
  month: string = '';
  created: number = 0;
  completed: number = 0;
  overdue: number = 0;
}

export class EmployeeScore {
  employeeId: string = '';
  employeeName: string = '';
  departmentName: string = '';
  averageScore: number = 0;
  reviewCount: number = 0;
}

export interface PerformanceAnalytics {
  averageReviewScore: number;
  totalReviews: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  activePIPs: number;
  completedPIPs: number;
  failedPIPs: number;
  scoreDistribution: number[];
  monthlyGoalStats: MonthlyGoalStats[];
  atRiskEmployees: EmployeeScore[];
  goalCompletionRate: number;
  averageGoalProgress: number;
}
