import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { Observable } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { NotificationItem } from '../../../core/models/notification.model';

import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { AttendanceSimulatorComponent } from '../attendance-simulator/attendance-simulator.component';

@Component({
  selector: 'app-shared-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, HasRoleDirective, AttendanceSimulatorComponent],
  templateUrl: './shared-navbar.component.html',
  styleUrl: './shared-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SharedNavbarComponent implements OnInit {
  @Input() activePage: string = 'dashboard';
  @Input() showSubTabs: boolean = false;
  @Input() subTabTitle: string = '';
  @Input() activeSubTab: string = '';

  currentUser$: Observable<User | null>;
  unreadCount$: Observable<number>;

  isManagementOpen: boolean = false;
  isMoreOpen: boolean = false;
  showSimulator: boolean = false;
  showNotifPanel: boolean = false;
  notifications: NotificationItem[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.authService.currentUser;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {
    this.notificationService.refreshUnreadCount();
  }

  toggleManagement() {
    this.isManagementOpen = !this.isManagementOpen;
    if (this.isManagementOpen) this.isMoreOpen = false; // Close others
  }

  closeManagement() {
    this.isManagementOpen = false;
  }

  toggleMore() {
    this.isMoreOpen = !this.isMoreOpen;
    if (this.isMoreOpen) this.isManagementOpen = false; // Close others
  }

  closeMore() {
    this.isMoreOpen = false;
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
      this.notificationService.getMyNotifications().subscribe(list => {
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
    this.notificationService.markRead(id).subscribe(() => {
      const notif = this.notifications.find(n => n.id === id);
      if (notif) notif.isRead = true;
      this.cdr.markForCheck();
    });
  }

  onMarkAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => (n.isRead = true));
      this.cdr.markForCheck();
    });
  }

  logout() {
    this.authService.logout();
  }
}
