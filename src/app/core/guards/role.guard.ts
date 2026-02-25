import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  // 1. Check Login
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Get User Roles
  const user = authService.currentUserValue;
  const userRoles = user?.roles || [];

  // 3. Get Required Roles from Route Data
  const requiredRoles = route.data['roles'] as Array<string>;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No specific roles required
  }

  // 4. Check if User has ANY of the required roles
  const hasRole = userRoles.some(role => requiredRoles.includes(role));

  if (hasRole) {
    return true;
  } else {
    // 5. Access Denied
    toast.showError('Access Denied', 'You do not have permission to view this page.');
    router.navigate(['/dashboard']);
    return false;
  }
};
