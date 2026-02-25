import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SharedNavbarComponent } from '@shared/components/shared-navbar/shared-navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Subject, filter, map, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, SharedNavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
      <!-- Left Sidebar -->
      <app-sidebar [activePage]="activePage"></app-sidebar>

      <!-- Right: Topbar + Page Content -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Slim Topbar -->
        <app-shared-navbar [activePage]="activePage"></app-shared-navbar>

        <!-- Scrollable page area -->
        <main class="flex-1 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnDestroy {
  activePage: string = 'dashboard';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let child = this.route.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        return child?.snapshot?.data?.['activePage'] ?? 'dashboard';
      }),
      takeUntil(this.destroy$)
    ).subscribe(activePage => {
      this.activePage = activePage;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
