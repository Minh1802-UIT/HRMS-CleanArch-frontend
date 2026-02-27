import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { User } from '@core/models/user.model';
import { ToastService } from '@core/services/toast.service';
import { LoggerService } from '@core/services/logger.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit, OnDestroy {
  // ... properties
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  isDrawerOpen = false;
  selectedUser: User | null = null;
  availableRoles: string[] = [];
  selectedRoles: { [key: string]: boolean } = {};
  saving = false;
  searchTerm = '';
  private destroy$ = new Subject<void>();

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  Math = Math;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoles() {
    this.authService.getRoles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (roles) => {
        this.availableRoles = roles;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load roles', err);
        this.toastService.showError('Load Error', 'Could not load roles');
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.authService.getAllUsers(this.currentPage, this.pageSize, this.searchTerm).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.users = result.items;
        this.totalItems = result.totalCount;
        this.totalPages = result.totalPages;
        
        // Internal filtering for the current page if needed, 
        // but server-side search is better. However, the backend 
        // doesn't have a keyword parameter for GetUsers yet. 
        // I will add [AsParameters] keyword if I want to search server-side.
        // For now, I'll keep it simple or implement keyword on backend if I have time.
        // Actually, let's keep it simple as per plan.
        this.filteredUsers = [...this.users];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load users', err);
        this.toastService.showError('Load Error', err?.error?.message || 'Could not load users');
        this.toastService.showError('Error', 'Failed to load users');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
    }
    return pages;
  }

  openRoleDrawer(user: User) {
    this.selectedUser = user;
    this.selectedRoles = {};
    this.availableRoles.forEach(role => {
      this.selectedRoles[role] = user.roles?.includes(role) || false;
    });
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedUser = null;
  }

  toggleRole(role: string) {
    this.selectedRoles[role] = !this.selectedRoles[role];
  }

  sendResetPasswordEmail(user: User) {
    if (!user.email) {
      this.toastService.showError('Action Failed', 'User does not have an email address.');
      return;
    }
    
    if (confirm(`Are you sure you want to send a password reset email to ${user.email}?`)) {
      this.authService.forgotPassword(user.email).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastService.showSuccess('Email Sent', `Password reset instructions have been sent to ${user.email}.`);
        },
        error: (err) => {
          this.logger.error('Failed to send reset email', err);
          this.toastService.showError('Error', err?.error?.message || 'Failed to send password reset email.');
        }
      });
    }
  }

  saveRoles() {
    if (!this.selectedUser) return;
    
    this.saving = true;
    const newRoles = Object.keys(this.selectedRoles).filter(key => this.selectedRoles[key]);
    const username = this.selectedUser.username;

    this.authService.updateUserRoles(this.selectedUser.id, newRoles).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
          if (this.selectedUser) {
             this.selectedUser.roles = newRoles;
          }
          this.saving = false;
          this.closeDrawer();
          this.toastService.showSuccess('Updated', `Roles updated for ${username}`);
          this.cdr.markForCheck();
      },
      error: (err) => {
          this.logger.error('Failed to update user roles', err);
          this.saving = false;
          this.toastService.showError('Update Failed', 'Failed to update roles');
          this.cdr.markForCheck();
      }
    });
  }

  trackByUser(index: number, user: User): string { return user.id || user.email; }
  trackByRole(index: number, role: string): string { return role; }
  trackByPage(index: number, page: number): number { return page; }

  getRoleBadgeClass(role: string): string {
    switch(role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'HR': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'Manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Employee': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-600';
    }
  }
}
