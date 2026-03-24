import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { PerformanceService } from '../../services/performance.service';
import { PerformanceAnalytics } from '../../models/performance.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-performance-analytics',
  standalone: true,
  imports: [NgClass, DatePipe, DecimalPipe],
  templateUrl: './performance-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceAnalyticsComponent implements OnInit, OnDestroy {
  analytics: PerformanceAnalytics | null = null;
  isLoading = true;
  isDarkMode = false;

  private scoreChart: Chart | null = null;
  private monthlyChart: Chart | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private performanceService: PerformanceService,
    private cdr: ChangeDetectorRef
  ) {
    // Detect dark mode
    this.isDarkMode = document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      this.isDarkMode = document.documentElement.classList.contains('dark');
      this.updateChartColors();
      this.cdr.markForCheck();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.scoreChart?.destroy();
    this.monthlyChart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.performanceService.getAnalytics().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.analytics = data;
        this.isLoading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.initCharts(), 50);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getScoreChartLabels(): string[] {
    return ['0-20', '21-40', '41-60', '61-80', '81-100'];
  }

  private initCharts(): void {
    if (!this.analytics) return;
    this.initScoreChart();
    this.initMonthlyChart();
  }

  private initScoreChart(): void {
    const canvas = document.getElementById('scoreDistributionChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.scoreChart?.destroy();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.scoreChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.getScoreChartLabels(),
        datasets: [{
          data: this.analytics?.scoreDistribution || [0, 0, 0, 0, 0],
          backgroundColor: [
            '#f87171', // 0-20 red
            '#fb923c', // 21-40 orange
            '#fbbf24', // 41-60 yellow
            '#34d399', // 61-80 emerald
            '#22c55e', // 81-100 green
          ],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.isDarkMode ? '#d4d4d8' : '#3f3f46',
              font: { size: 12, weight: 600 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} reviews`
            }
          }
        }
      }
    });
  }

  private initMonthlyChart(): void {
    const canvas = document.getElementById('monthlyGoalsChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.monthlyChart?.destroy();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.analytics?.monthlyGoalStats.map(m => m.month) || [];
    const createdData = this.analytics?.monthlyGoalStats.map(m => m.created) || [];
    const completedData = this.analytics?.monthlyGoalStats.map(m => m.completed) || [];
    const overdueData = this.analytics?.monthlyGoalStats.map(m => m.overdue) || [];

    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Created',
            data: createdData,
            backgroundColor: 'rgba(139, 92, 246, 0.7)', // violet
            borderRadius: 6,
          },
          {
            label: 'Completed',
            data: completedData,
            backgroundColor: 'rgba(52, 211, 153, 0.7)', // emerald
            borderRadius: 6,
          },
          {
            label: 'Overdue',
            data: overdueData,
            backgroundColor: 'rgba(248, 113, 113, 0.7)', // rose
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#d4d4d8' : '#3f3f46',
              font: { size: 12, weight: 600 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: this.isDarkMode ? '#71717a' : '#a1a1aa',
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.isDarkMode ? '#27272a' : '#f4f4f5' },
            ticks: {
              color: this.isDarkMode ? '#71717a' : '#a1a1aa',
              font: { size: 11 },
              stepSize: 1
            }
          }
        }
      }
    });
  }

  private updateChartColors(): void {
    this.scoreChart?.destroy();
    this.monthlyChart?.destroy();
    if (this.analytics) {
      setTimeout(() => this.initCharts(), 100);
    }
  }

  getScorePercent(score: number): number {
    return Math.round(score);
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-rose-500';
  }

  trackById(_: number, item: { employeeId: string }): string { return item.employeeId; }
}
