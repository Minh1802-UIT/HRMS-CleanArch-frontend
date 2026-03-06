import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { LayoutService } from '../layout.service';
import { LanguageService } from '@core/services/language.service';
import { Subject, takeUntil, filter } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  activePage?: string;
  roles?: string[];
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL_GROUPS: NavGroup[] = [
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
        icon: 'person_clock',
        children: [
          { label: 'Check In/Out',    icon: 'login',           route: '/attendance/check-in',       activePage: 'checkin' },
          { label: 'My History',      icon: 'history',         route: '/attendance/my-history',      activePage: 'my-history' },
          { label: 'My Explanations', icon: 'pending_actions', route: '/attendance/my-explanations', activePage: 'my-explanations' },
          { label: 'Leave Request',   icon: 'event_available', route: '/leaves',                     activePage: 'leaves' },
        ],
      },
      {
        label: 'Management',
        icon: 'manage_history',
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

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() activePage: string = 'dashboard';

  collapsed = signal(false);
  expandedParents = signal<Set<string>>(new Set());

  private userRoles$ = signal<string[]>([]);
  private destroy$ = new Subject<void>();

  filteredGroups = computed(() => {
    const roles = this.userRoles$();
    const filterItems = (items: NavItem[]): NavItem[] =>
      items
        .map(item => {
          if (item.children) {
            if (item.roles && !item.roles.some(r => roles.includes(r))) return null;
            const filteredChildren = item.children.filter(
              c => !c.roles || c.roles.some(r => roles.includes(r))
            );
            return filteredChildren.length === 0 ? null : { ...item, children: filteredChildren };
          }
          return (!item.roles || item.roles.some(r => roles.includes(r))) ? item : null;
        })
        .filter((item): item is NavItem => item !== null);

    return ALL_GROUPS
      .map(group => ({ ...group, items: filterItems(group.items) }))
      .filter(group => group.items.length > 0);
  });

  /** Flat leaf items for the collapsed (icon-only) sidebar */
  flatItems = computed(() =>
    this.filteredGroups().flatMap(group =>
      group.items.flatMap(item => item.children ?? [item])
    )
  );

  constructor(
    private router: Router,
    private authService: AuthService,
    public layoutService: LayoutService,
    public langService: LanguageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.userRoles$.set(user?.roles ?? []);
        this.syncExpandedParents();
      });

    this.langService.langChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        this.syncExpandedParents();
        this.layoutService.closeMobileSidebar();
      });

    this.syncExpandedParents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(): void {
    this.collapsed.update(v => !v);
  }

  toggleParent(label: string): void {
    this.expandedParents.update(set => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
    this.cdr.markForCheck();
  }

  isParentExpanded(label: string): boolean {
    return this.expandedParents().has(label);
  }

  isParentActive(parent: NavItem): boolean {
    return parent.children?.some(c => this.isActive(c.activePage ?? '')) ?? false;
  }

  private syncExpandedParents(): void {
    this.filteredGroups().forEach(group =>
      group.items.forEach(item => {
        if (item.children && this.isParentActive(item)) {
          this.expandedParents.update(set => new Set([...set, item.label]));
        }
      })
    );
    this.cdr.markForCheck();
  }

  isActive(activePage: string): boolean {
    if (!activePage) return false;
    const url = this.router.url;
    const routeMap: Record<string, string> = {
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
    const route = routeMap[activePage];
    if (!route) return false;
    if (activePage === 'dashboard') return url === '/dashboard' || url.startsWith('/dashboard?');
    const allRoutes = Object.values(routeMap);
    const hasMoreSpecificMatch = allRoutes.some(
      r => r !== route && r.startsWith(route + '/') && url.startsWith(r)
    );
    if (hasMoreSpecificMatch) return false;
    return url.startsWith(route);
  }
}
