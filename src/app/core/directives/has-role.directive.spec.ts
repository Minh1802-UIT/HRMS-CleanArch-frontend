import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '@core/services/auth.service';
import { User } from '@core/models/user.model';

// Host component to test the structural directive
@Component({
  template: `<div *appHasRole="roles"><span class="protected">Secret</span></div>`,
  standalone: true,
  imports: [HasRoleDirective]
})
class TestHostComponent {
  roles: string | string[] = 'Admin';
}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let currentUser$: BehaviorSubject<User | null>;

  beforeEach(() => {
    currentUser$ = new BehaviorSubject<User | null>(null);

    TestBed.configureTestingModule({
      imports: [TestHostComponent, HasRoleDirective],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: currentUser$.asObservable() }
        }
      ]
    });

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should hide content when user is null', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('should hide content when user has no matching role', () => {
    host.roles = 'Admin';
    currentUser$.next({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('should show content when user has the required role (string)', () => {
    host.roles = 'Admin';
    currentUser$.next({ id: '1', username: 'admin', email: 'a@t.com', roles: ['Admin'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should show content when user has one of the required roles (array)', () => {
    host.roles = ['Admin', 'Manager'];
    currentUser$.next({ id: '1', username: 'mgr', email: 'm@t.com', roles: ['Manager'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should show content when roles input is empty (no restriction)', () => {
    host.roles = [];
    currentUser$.next({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should dynamically show/hide when user changes', () => {
    host.roles = 'Admin';

    // Start with no matching role
    currentUser$.next({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();

    // User gains Admin role
    currentUser$.next({ id: '1', username: 'admin', email: 'a@t.com', roles: ['Admin'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();

    // User loses Admin role
    currentUser$.next({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('should hide content when user has empty roles array', () => {
    host.roles = 'Admin';
    currentUser$.next({ id: '1', username: 'nobody', email: 'n@t.com', roles: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });
});
