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
