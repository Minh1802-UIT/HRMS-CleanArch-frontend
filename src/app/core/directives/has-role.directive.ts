import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  @Input() appHasRole: string | string[] = [];
  private stop$ = new Subject<void>();
  private isVisible = false;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {
    // Effect to react to user changes
    effect(() => {
      const user = untracked(() => this.authService.user());
      if (user) {
        this.updateView(user.roles || []);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    // Initial check - but wait for effect to trigger
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
