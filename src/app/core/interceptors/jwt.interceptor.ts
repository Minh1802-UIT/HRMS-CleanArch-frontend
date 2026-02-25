import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { catchError, switchMap, filter, take, throwError, map } from 'rxjs';

/**
 * JWT Interceptor with automatic token refresh on 401.
 *
 * Flow:
 * 1. Attach access token to every request (except auth endpoints)
 * 2. If response is 401:
 *    a. If no refresh in progress → start refresh, then retry original request
 *    b. If refresh already in progress → queue and wait for new token, then retry
 * 3. If refresh fails → logout
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Don't attach token to auth endpoints (login, register, refresh-token)
  if (isAuthRequest(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  const authedReq = token ? addTokenToRequest(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest(req.url)) {
        return handleUnauthorized(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handleUnauthorized(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
) {
  if (authService.isRefreshInProgress) {
    // Another request already triggered a refresh — wait for it to complete
    return authService.onRefreshComplete.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        if (token === 'REFRESH_FAILED') {
          return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Token refresh failed' }));
        }
        return next(addTokenToRequest(req, token!));
      })
    );
  }

  // No refresh in progress — start one
  return authService.refreshAccessToken().pipe(
    switchMap(newToken => next(addTokenToRequest(req, newToken)))
  );
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}

function isAuthRequest(url: string): boolean {
  return url.includes('/auth/login') ||
         url.includes('/auth/register') ||
         url.includes('/auth/refresh-token') ||
         url.includes('/auth/logout'); // logout clears cookie — no token needed
}
