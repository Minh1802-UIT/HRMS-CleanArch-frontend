import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { User } from '../../../core/models/user.model';
import { NotificationItem } from '../../../core/models/notification.model';

import { AttendanceSimulatorComponent } from '../attendance-simulator/attendance-simulator.component';

const PAGE_TITLES: Record<string, string> = {
  dashboard:     'Dashboard',
  employees:     'Employees',
  departments:   'Departments',
  positions:     'Positions',
  'org-chart':   'Org Chart',
  attendance:    'Attendance',
  shifts:        'Shifts',
  leaves:        'Leave Requests',
  approvals:     'Approvals',
  'leave-reports': 'Leave Reports',
  performance:   'Performance',
  recruitment:   'Recruitment',
  payroll:       'Payroll',
  'user-management': 'User Management',
  'audit-logs':  'Audit Logs',
  profile:       'My Profile',
};

@Component({
  selector: 'app-shared-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AttendanceSimulatorComponent],
  templateUrl: './shared-navbar.component.html',
  styleUrl: './shared-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SharedNavbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() activePage: string = 'dashboard';
  @Input() showSubTabs: boolean = false;
  @Input() subTabTitle: string = '';
  @Input() activeSubTab: string = '';

  currentUser$: Observable<User | null>;
  unreadCount$: Observable<number>;

  showSimulator: boolean = false;
  showNotifPanel: boolean = false;
  notifications: NotificationItem[] = [];

  get pageTitle(): string {
    return PAGE_TITLES[this.activePage] ?? 'HR Management';
  }

  get isDark(): boolean { return this.themeService.isDark(); }

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {
    this.notificationService.refreshUnreadCount();
  }

  openSimulator() {
    this.showSimulator = true;
  }

  closeSimulator() {
    this.showSimulator = false;
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      this.notificationService.getMyNotifications().pipe(takeUntil(this.destroy$)).subscribe(list => {
        this.notifications = list;
        this.cdr.markForCheck();
      });
    }
  }

  closeNotifPanel(): void {
    this.showNotifPanel = false;
  }

  onMarkRead(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.markRead(id).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const notif = this.notifications.find(n => n.id === id);
      if (notif) notif.isRead = true;
      this.cdr.markForCheck();
    });
  }

  onMarkAllRead(): void {
    this.notificationService.markAllRead().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notifications.forEach(n => (n.isRead = true));
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.authService.logout();
  }
}
