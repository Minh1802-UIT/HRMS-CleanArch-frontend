import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard/pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'change-password', loadComponent: () => import('./features/auth/pages/change-password/change-password.component').then(m => m.ChangePasswordComponent), canActivate: [authGuard] },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  // All authenticated routes wrapped in MainLayoutComponent (shared navbar + footer)
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent), data: { activePage: 'dashboard' } },
      { path: 'employees', loadComponent: () => import('./features/employee/pages/employee-list/employee-list.component').then(m => m.EmployeeListComponent), data: { activePage: 'employees' } },
      { path: 'directory', loadComponent: () => import('./features/employee/pages/employee-directory/employee-directory.component').then(m => m.EmployeeDirectoryComponent), data: { activePage: 'employees' } },
      { path: 'org-chart', loadComponent: () => import('./features/employee/pages/org-chart/org-chart.component').then(m => m.OrgChartComponent), data: { activePage: 'employees' } },

      // Create/Edit Employees -> Admin/HR
      { path: 'add-employee', loadComponent: () => import('./features/employee/pages/add-employee/add-employee.component').then(m => m.AddEmployeeComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'employees' } },
      { path: 'employees/add', loadComponent: () => import('./features/employee/pages/add-employee/add-employee.component').then(m => m.AddEmployeeComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'employees' } },

      { path: 'employee-profile/:id', loadComponent: () => import('./features/employee/pages/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'employees' } },

      // Recruitment -> Admin/HR
      { path: 'recruitment', loadComponent: () => import('./features/recruitment/pages/recruitment/recruitment.component').then(m => m.RecruitmentComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'recruitment' } },
      { path: 'recruitment/candidates/:id', loadComponent: () => import('./features/recruitment/pages/recruitment/candidate-detail/candidate-detail.component').then(m => m.CandidateDetailComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'recruitment' } },

      // System -> Admin
      { path: 'system/users', loadComponent: () => import('./features/system/pages/user-management/user-management.component').then(m => m.UserManagementComponent), canActivate: [roleGuard], data: { roles: ['Admin'], activePage: 'user-management' } },
      { path: 'system/audit-logs', loadComponent: () => import('./features/system/pages/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent), canActivate: [roleGuard], data: { roles: ['Admin'], activePage: 'audit-logs' } },
      { path: 'system/positions', loadComponent: () => import('./features/organization/pages/positions/position-list/position-list.component').then(m => m.PositionListComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'positions' } },

      // Attendance -> Admin/HR/Manager
      { path: 'attendance', loadComponent: () => import('./features/attendance/pages/attendance/attendance.component').then(m => m.AttendanceComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'attendance' } },
      { path: 'attendance/shifts', loadComponent: () => import('./features/attendance/pages/attendance/shift-list/shift-list.component').then(m => m.ShiftListComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'shifts' } },
      { path: 'attendance/shifts/add', loadComponent: () => import('./features/attendance/pages/attendance/shift-form/shift-form.component').then(m => m.ShiftFormComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'shifts' } },
      { path: 'attendance/shifts/edit/:id', loadComponent: () => import('./features/attendance/pages/attendance/shift-form/shift-form.component').then(m => m.ShiftFormComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'shifts' } },

      { path: 'departments', loadComponent: () => import('./features/organization/pages/departments/departments.component').then(m => m.DepartmentsComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'Departments' } },

      // Payroll -> Admin/HR/Manager
      { path: 'payroll', loadComponent: () => import('./features/payroll/pages/payroll/payroll.component').then(m => m.PayrollComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'payroll' } },
      // Annual PIT Tax Report -> Admin/HR
      { path: 'payroll/tax-report', loadComponent: () => import('./features/payroll/pages/tax-report/tax-report.component').then(m => m.TaxReportComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'payroll' } },

      { path: 'leaves', loadComponent: () => import('./features/leave/pages/leave-request/leave-request.component').then(m => m.LeaveRequestComponent), data: { activePage: 'Time & Attendance' } },
      { path: 'approvals', loadComponent: () => import('./features/leave/pages/leave-approval/leave-approval.component').then(m => m.LeaveApprovalComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'Management' } },
      { path: 'admin/leave-reports', loadComponent: () => import('./features/leave/pages/leave-report/leave-report.component').then(m => m.LeaveReportComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR'], activePage: 'Leave Reports' } },

      // Navigation aliases
      { path: 'time-tracking', redirectTo: 'attendance', pathMatch: 'full' },
      { path: 'tasks', redirectTo: 'approvals', pathMatch: 'full' },
      { path: 'performance', loadComponent: () => import('./features/performance/pages/performance/performance.component').then(m => m.PerformanceComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'performance' } },

      { path: 'employees/:id', loadComponent: () => import('./features/employee/pages/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent), canActivate: [roleGuard], data: { roles: ['Admin', 'HR', 'Manager'], activePage: 'employees' } },
      { path: 'profile', loadComponent: () => import('./features/employee/pages/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent), data: { activePage: 'profile' } },
    ]
  },

  // 404 - Redirect unknown routes to dashboard
  { path: '**', redirectTo: '/dashboard' }
];
