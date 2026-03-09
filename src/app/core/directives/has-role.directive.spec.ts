import { Component, signal, WritableSignal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
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
  let userSignal: WritableSignal<User | null>;

  beforeEach(() => {
    userSignal = signal<User | null>(null);

    TestBed.configureTestingModule({
      imports: [TestHostComponent, HasRoleDirective],
      providers: [
        {
          provide: AuthService,
          useValue: { user: userSignal }
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
    userSignal.set({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('should show content when user has the required role (string)', () => {
    host.roles = 'Admin';
    userSignal.set({ id: '1', username: 'admin', email: 'a@t.com', roles: ['Admin'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should show content when user has one of the required roles (array)', () => {
    host.roles = ['Admin', 'Manager'];
    userSignal.set({ id: '1', username: 'mgr', email: 'm@t.com', roles: ['Manager'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should show content when roles input is empty (no restriction)', () => {
    host.roles = [];
    userSignal.set({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();
  });

  it('should dynamically show/hide when user changes', () => {
    host.roles = 'Admin';

    // Start with no matching role
    userSignal.set({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();

    // User gains Admin role
    userSignal.set({ id: '1', username: 'admin', email: 'a@t.com', roles: ['Admin'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeTruthy();

    // User loses Admin role
    userSignal.set({ id: '1', username: 'user', email: 'u@t.com', roles: ['Employee'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('should hide content when user has empty roles array', () => {
    host.roles = 'Admin';
    userSignal.set({ id: '1', username: 'nobody', email: 'n@t.com', roles: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });
});
