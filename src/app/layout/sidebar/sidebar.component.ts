import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { LayoutService } from '../layout.service';
import { LanguageService } from '@core/services/language.service';
import { Subject, takeUntil, filter } from 'rxjs';
import { NavItem, NavGroup, NAV_CONFIG, ROUTE_MAP } from './nav.config';

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

    return NAV_CONFIG
      .map(group => ({ ...group, items: filterItems(group.items) }))
      .filter(group => group.items.length > 0);
  });

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
  ) {
    // Listen to user changes and update roles
    effect(() => {
      const user = this.authService.user();
      this.userRoles$.set(user?.roles ?? []);
      this.syncExpandedParents();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
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
    const route = ROUTE_MAP[activePage];
    if (!route) return false;
    if (activePage === 'dashboard') return url === '/dashboard' || url.startsWith('/dashboard?');
    const allRoutes = Object.values(ROUTE_MAP);
    const hasMoreSpecificMatch = allRoutes.some(
      r => r !== route && r.startsWith(route + '/') && url.startsWith(r)
    );
    if (hasMoreSpecificMatch) return false;
    return url.startsWith(route);
  }
}
