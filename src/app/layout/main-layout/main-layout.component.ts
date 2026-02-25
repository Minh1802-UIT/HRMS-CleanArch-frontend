import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';

import { RouterModule, RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SharedNavbarComponent } from '@shared/components/shared-navbar/shared-navbar.component';
import { AppFooter } from '../../components/footer/app.footer';
import { Subject, filter, map, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, SharedNavbarComponent, AppFooter],
  template: `
    <div class="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      <app-shared-navbar
        [activePage]="activePage"
        [showSubTabs]="false"
      ></app-shared-navbar>
      <router-outlet></router-outlet>
      <app-footer></app-footer>
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
