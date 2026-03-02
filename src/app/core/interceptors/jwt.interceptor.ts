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

  // Don't attach token to auth/public endpoints (login, register, refresh-token, health)
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getToken();

  // ── Proactive silent refresh on page reload ───────────────────────────────
  // When _accessToken is null but there IS a user session (page reload after
  // in-memory token was lost), refresh BEFORE sending the request so we never
  // hit the backend without credentials (avoids a needless 401 round-trip).
  if (!token && authService.currentUserValue !== null) {
    if (authService.isRefreshInProgress) {
      // Another request already started the refresh — queue and wait
      return authService.onRefreshComplete.pipe(
        filter(t => t !== null),
        take(1),
        switchMap(t => {
          if (t === 'REFRESH_FAILED') {
            return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Token refresh failed' }));
          }
          return next(addTokenToRequest(req, t!));
        })
      );
    }
    // First request after reload — trigger refresh then send with new token
    return authService.refreshAccessToken().pipe(
      switchMap(newToken => next(addTokenToRequest(req, newToken))),
      catchError(err => throwError(() => err))
    );
  }

  const authedReq = token ? addTokenToRequest(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicEndpoint(req.url)) {
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

/** URLs that should pass through without auth token or refresh attempts. */
function isPublicEndpoint(url: string): boolean {
  return url.includes('/auth/login') ||
         url.includes('/auth/register') ||
         url.includes('/auth/refresh-token') ||
         url.includes('/auth/logout') || // logout clears cookie — no token needed
         url.endsWith('/health');         // public health-check (warmup ping)
}
