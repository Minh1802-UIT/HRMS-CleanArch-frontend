import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  @Input() appHasRole: string | string[] = [];
  private stop$ = new Subject<void>();
  private isVisible = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser.pipe(takeUntil(this.stop$)).subscribe(user => {
      this.updateView(user?.roles || []);
    });
  }

  ngOnDestroy() {
    this.stop$.next();
    this.stop$.complete();
  }

  private updateView(userRoles: string[]) {
    // If no roles are required (empty input), show the element by default
    if (!this.appHasRole || this.appHasRole.length === 0) {
      if (!this.isVisible) {
        this.isVisible = true;
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
      return;
    }

    const requiredRoles = Array.isArray(this.appHasRole) 
      ? this.appHasRole 
      : [this.appHasRole];

    const hasRole = userRoles.some(role => requiredRoles.includes(role));

    if (hasRole && !this.isVisible) {
      this.isVisible = true;
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else if (!hasRole && this.isVisible) {
      this.isVisible = false;
      this.viewContainer.clear();
    }
  }
}
