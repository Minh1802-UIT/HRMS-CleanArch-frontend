export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  activePage?: string;
  roles?: string[];
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_CONFIG: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', activePage: 'dashboard' },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees',   icon: 'group',         route: '/employees',        activePage: 'employees',   roles: ['Admin', 'HR', 'Manager'] },
      { label: 'Departments', icon: 'corporate_fare', route: '/departments',      activePage: 'departments', roles: ['Admin', 'HR'] },
      { label: 'Positions',   icon: 'badge',          route: '/system/positions', activePage: 'positions',   roles: ['Admin', 'HR'] },
      { label: 'Org Chart',   icon: 'account_tree',   route: '/org-chart',        activePage: 'org-chart' },
    ],
  },
  {
    title: 'Time & Leave',
    items: [
      {
        label: 'My Time',
        icon: 'calendar_today',
        children: [
          { label: 'Check In/Out',    icon: 'login',           route: '/attendance/check-in',       activePage: 'checkin' },
          { label: 'My History',      icon: 'history',         route: '/attendance/my-history',      activePage: 'my-history' },
          { label: 'My Explanations', icon: 'pending_actions', route: '/attendance/my-explanations', activePage: 'my-explanations' },
          { label: 'Leave Request',   icon: 'event_available', route: '/leaves',                     activePage: 'leaves' },
        ],
      },
      {
        label: 'Management',
        icon: 'tune',
        roles: ['Admin', 'HR', 'Manager'],
        children: [
          { label: 'Attendance',    icon: 'fingerprint', route: '/attendance',                   activePage: 'attendance',        roles: ['Admin', 'HR', 'Manager'] },
          { label: 'Shifts',        icon: 'schedule',    route: '/attendance/shifts',             activePage: 'shifts',            roles: ['Admin', 'HR', 'Manager'] },
          { label: 'Approvals',     icon: 'approval',    route: '/approvals',                    activePage: 'approvals',         roles: ['Admin', 'HR', 'Manager'] },
          { label: 'Explanations',  icon: 'rate_review', route: '/attendance/explanations',      activePage: 'explanations',      roles: ['Admin', 'HR', 'Manager'] },
          { label: 'OT Schedule',   icon: 'more_time',   route: '/attendance/overtime-schedule', activePage: 'overtime-schedule', roles: ['Admin', 'HR'] },
          { label: 'Leave Reports', icon: 'summarize',   route: '/admin/leave-reports',          activePage: 'leave-reports',     roles: ['Admin', 'HR'] },
        ],
      },
    ],
  },
  {
    title: 'Talent',
    items: [
      { label: 'Performance', icon: 'trending_up',  route: '/performance', activePage: 'performance', roles: ['Admin', 'HR', 'Manager'] },
      { label: 'Recruitment', icon: 'work_outline', route: '/recruitment', activePage: 'recruitment', roles: ['Admin', 'HR'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payroll', icon: 'payments', route: '/payroll', activePage: 'payroll', roles: ['Admin', 'HR'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users',      icon: 'manage_accounts', route: '/system/users',      activePage: 'user-management', roles: ['Admin'] },
      { label: 'Audit Logs', icon: 'policy',          route: '/system/audit-logs', activePage: 'audit-logs',      roles: ['Admin'] },
    ],
  },
];

export const ROUTE_MAP: Record<string, string> = {
  dashboard: '/dashboard',
  employees: '/employees',
  departments: '/departments',
  positions: '/system/positions',
  'org-chart': '/org-chart',
  checkin: '/attendance/check-in',
  'my-history': '/attendance/my-history',
  'my-explanations': '/attendance/my-explanations',
  attendance: '/attendance',
  shifts: '/attendance/shifts',
  explanations: '/attendance/explanations',
  'overtime-schedule': '/attendance/overtime-schedule',
  leaves: '/leaves',
  approvals: '/approvals',
  'leave-reports': '/admin/leave-reports',
  performance: '/performance',
  recruitment: '/recruitment',
  payroll: '/payroll',
  'user-management': '/system/users',
  'audit-logs': '/system/audit-logs',
};
