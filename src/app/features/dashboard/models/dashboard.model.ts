export interface SummaryCard {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; isPositive: boolean };
  colorScheme: 'blue' | 'green' | 'orange' | 'purple';
}

export interface AttendanceTrend {
  labels: string[];
  data: number[];
}

export interface RecruitmentStats {
  jobOpenings: number;
  newCandidates: number;
  interviewed: number;
  pendingFeedback: number;
}

export interface JobVacancy {
  title: string;
  totalCandidates: number;
  vacancies: number;
  expiredDate: Date;
}

export interface OngoingProcess {
  candidateName: string;
  role: string;
  status: string;
}

export interface DashboardEvent {
  title: string;
  date: Date;
  type: 'Event' | 'Birthday' | 'Anniversary';
}

export interface DashboardLeave {
  employeeName: string;
  avatarUrl: string;
  status: string;
}

export interface Interview {
  candidateName: string;
  time: string;
  duration: string;
}

export interface NewHire {
  name: string;
  initials: string;
  position: string;
  joinDate: Date;
  colorScheme: string;
}

export interface PendingRequest {
  employeeName: string;
  initials: string;
  dateRange: string;
  type: string;
  colorScheme: string;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface DashboardAnalytics {
  staffDistribution: ChartData;
  recruitmentFunnel: ChartData;
}

export interface DashboardData {
  summaryCards: SummaryCard[];
  attendanceTrend: AttendanceTrend;
  recruitmentStats: RecruitmentStats;
  recentJobs: JobVacancy[];
  ongoingProcesses: OngoingProcess[];
  upcomingEvents: DashboardEvent[];
  whoIsOnLeave: DashboardLeave[];
  todayInterviews: Interview[];
  recentHires: NewHire[];
  pendingRequests: PendingRequest[];
  analytics: DashboardAnalytics;
}
