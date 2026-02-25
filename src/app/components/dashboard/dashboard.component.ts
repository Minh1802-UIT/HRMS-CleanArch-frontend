import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, effect } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { HasRoleDirective } from '../../core/directives/has-role.directive';

import { DashboardService, SummaryCard, RecruitmentStats, JobVacancy, OngoingProcess, DashboardEvent, DashboardLeave, Interview, NewHire, PendingRequest, DashboardAnalytics, AttendanceTrend } from '@features/dashboard/services/dashboard.service';
import { AuditLogService } from '@features/system/services/audit-log.service';
import { AuditLog } from '@features/system/models/audit-log.model';
import { Chart, registerables } from 'chart.js';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { User } from '@core/models/user.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass, DatePipe,
    ButtonModule, ChartModule, TableModule, TagModule, MenuModule, RouterModule, HasRoleDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild('attendanceChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly today = new Date();
  readonly Math = Math;
  
  summaryCards: SummaryCard[] = [];
  auditLogs: AuditLog[] = [];
  chart?: Chart;
  attendanceTrendData: AttendanceTrend | null = null;
  isLoading: boolean = true;

  // New Dynamic Data
  recruitmentStats?: RecruitmentStats;
  recentJobs: JobVacancy[] = [];
  ongoingProcesses: OngoingProcess[] = [];
  upcomingEvents: DashboardEvent[] = [];
  whoIsOnLeave: DashboardLeave[] = [];
  todayInterviews: Interview[] = [];
  recentHires: NewHire[] = [];
  pendingRequests: PendingRequest[] = [];
  analytics?: DashboardAnalytics;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData!: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartOptions!: Record<string, any>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  distributionData!: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  distributionOptions!: Record<string, any>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funnelData!: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funnelOptions!: Record<string, any>;

  userDisplayName: string = '';

  constructor(
      private dashboardService: DashboardService,
      private auditLogService: AuditLogService,
      private logger: LoggerService,
      private authService: AuthService,
      private cdr: ChangeDetectorRef,
      private themeService: ThemeService
  ) {
    // Re-initialise chart colours whenever dark/light mode changes
    effect(() => {
      this.themeService.isDark(); // track signal
      this.initChartOptions();
      if (this.chartData) this.updateChartData();
      this.cdr.markForCheck();
    });
  }

  currentUser: User | null = null;
  private dashboardLoaded = false;

  ngOnInit() {
    this.initChartOptions();
    
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userDisplayName = user.fullName || user.username;
        const roles = user.roles || [];
        
        // Only load dashboard data once for Admin or HR
        if (!this.dashboardLoaded && (roles.includes('Admin') || roles.includes('HR'))) {
          this.dashboardLoaded = true;
          this.loadDashboardData();
          this.loadAuditLogs();
        }
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData() {
      this.dashboardService.getDashboardData().pipe(takeUntil(this.destroy$)).subscribe({
          next: (data) => {
              this.summaryCards = data.summaryCards;
              this.attendanceTrendData = data.attendanceTrend;
              this.recruitmentStats = data.recruitmentStats;
              this.recentJobs = data.recentJobs;
              this.ongoingProcesses = data.ongoingProcesses;
              this.upcomingEvents = data.upcomingEvents;
              this.whoIsOnLeave = data.whoIsOnLeave;
              this.todayInterviews = data.todayInterviews;
              this.recentHires = data.recentHires;
              this.pendingRequests = data.pendingRequests;
              this.analytics = data.analytics;
              this.updateChartData();
              this.isLoading = false;
              this.cdr.markForCheck();
          },
          error: (err) => {
              this.logger.error('Dashboard data error', err);
              this.isLoading = false;
              this.cdr.markForCheck();
          }
      });
  }

  loadAuditLogs() {
      this.auditLogService.getAuditLogs().pipe(takeUntil(this.destroy$)).subscribe({
          next: (result) => {
              this.auditLogs = result.items.slice(0, 5);
              this.cdr.markForCheck();
          },
          error: (err) => this.logger.error('Audit logs error', err)
      });
  }

  ngAfterViewInit() {
    // No longer need manual canvas init
  }

  private getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    const colors = {
      textColor:          isDark ? '#e4e4e7' : '#3f3f46',
      textColorSecondary: isDark ? '#a1a1aa' : '#71717a',
      surfaceBorder:      isDark ? '#3f3f46' : '#e4e4e7',
    };
    // Set Chart.js global default so every unlabelled element picks up the right colour
    Chart.defaults.color = colors.textColorSecondary;
    return colors;
  }

  initChartOptions() {
      const { textColor, textColorSecondary, surfaceBorder } = this.getChartColors();

      this.chartOptions = {
          maintainAspectRatio: false,
          aspectRatio: 0.6,
          plugins: {
              legend: {
                  labels: {
                      color: textColor
                  }
              }
          },
          scales: {
              x: {
                  ticks: {
                      color: textColorSecondary
                  },
                  grid: {
                      color: surfaceBorder,
                      drawBorder: false
                  }
              },
              y: {
                  ticks: {
                      color: textColorSecondary
                  },
                  grid: {
                      color: surfaceBorder,
                      drawBorder: false
                  }
              }
          }
      };
  }

  updateChartData() {
    if (!this.attendanceTrendData) return;

    const primaryColor = '#3b67f5';
    const accentColor = '#f59e0b';
    const { textColor } = this.getChartColors();

    // 1. Attendance Trend (Line Chart)
    this.chartData = {
        labels: this.attendanceTrendData.labels,
        datasets: [
            {
                label: 'Attendance Rate',
                data: this.attendanceTrendData.data,
                fill: true,
                borderColor: primaryColor,
                tension: 0.4,
                backgroundColor: 'rgba(59, 103, 245, 0.1)',
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: primaryColor
            }
        ]
    };

    // 2. Staff Distribution (Pie/Doughnut Chart)
    const distData = this.analytics?.staffDistribution; 
    if (distData) {
      this.distributionData = {
          labels: distData.labels,
          datasets: [
              {
                  data: distData.data,
                  backgroundColor: [primaryColor, accentColor, '#8B5CF6', '#10B981', '#64748B'],
                  hoverBackgroundColor: [primaryColor, accentColor, '#8B5CF6', '#10B981', '#64748B'],
                  borderWidth: 0
              }
          ]
      };
    }

    this.distributionOptions = {
        cutout: '60%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    color: textColor,
                    padding: 20,
                    font: { size: 12, weight: '500' }
                }
            }
        }
    };

    // 3. Recruitment Funnel (Horizontal Bar Chart)
    const funnelDataRaw = this.analytics?.recruitmentFunnel;
    if (funnelDataRaw) {
      this.funnelData = {
          labels: funnelDataRaw.labels,
          datasets: [
              {
                  label: 'Candidates',
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  data: funnelDataRaw.data,
                  borderRadius: 8,
                  barThickness: 24
              }
          ]
      };
    }

    this.funnelOptions = {
        indexAxis: 'y',
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        scales: {
            x: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                    color: textColor,
                    font: { size: 12, weight: '500' }
                }
            },
            y: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                    color: textColor,
                    font: { size: 12, weight: '600' }
                }
            }
        }
    };
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      'success': 'bg-green-100 text-green-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'error': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }

  getTotalEmployees(): string {
    const card = this.summaryCards.find(c => c.title === 'Total Employees');
    return card ? card.value.toString() : '0';
  }

  trackByIndex(index: number, item?: unknown): number { return index; }
  trackByInterviewId(index: number, item: Interview): string { return item.candidateName || String(index); }
  trackByLeaveId(index: number, item: DashboardLeave): string { return item.employeeName || String(index); }
  trackByLogId(index: number, item: AuditLog): string { return item.id || String(index); }
}
