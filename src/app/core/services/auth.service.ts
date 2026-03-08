import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiResponse, PagedResult } from '@core/models/api-response';
import { User, LoginCredentials, RegisterData, JwtPayload } from '@core/models/user.model';
import { LoggerService } from '@core/services/logger.service';

/** User info sub-object embedded in the login response. Mirrors backend UserDto. */
interface LoginUserData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  employeeId?: string;
  roles: string[];
  isActive: boolean;
  mustChangePassword: boolean;
}

/** Fixed contract for POST /api/auth/login  → ApiResponse<LoginSuccessData> */
interface LoginSuccessData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: LoginUserData;
}

/** Fixed contract for POST /api/auth/refresh-token → ApiResponse<RefreshSuccessData> */
interface RefreshSuccessData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // ─── In-memory access token (never persisted to storage) ─────────────────
  // Access tokens in sessionStorage/localStorage are readable by any JS code
  // running on the page (XSS). Keeping the token in a private class field means
  // it is inaccessible to third-party scripts. On page reload the field is null;
  // the JWT interceptor triggers refreshAccessToken() which uses the httpOnly
  // refresh-token cookie to silently obtain a new access token.
  private _accessToken: string | null = null;

  // Timer ID for the proactive background refresh scheduled ~2 min before expiry.
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // State management with Signals only
  private currentUserSignal = signal<User | null>(this.getInitialUser());
  public readonly user = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.user());

  // Refresh token state - using Signal instead of BehaviorSubject
  private isRefreshingSignal = signal<boolean>(false);
  private refreshTokenSignal = signal<string | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private logger: LoggerService
  ) {
    const user = this.currentUserSignal();

    // ── One-time migration ────────────────────────────────────────────────────
    // Old sessions (before in-memory token implementation) stored the JWT inside
    // the currentUser object in sessionStorage.  Promote it into _accessToken so
    // the first round of API calls after a page reload works without a 401 trip.
    if (user?.token) {
      this._accessToken = user.token;
      // Re-save metadata without the token so future reloads go through the
      // normal silent-refresh path instead of reading a now-stale value.
      this.storeUserMetadata(user);
      // Sanitise the in-memory signal too (keeps the model coherent).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _t, refreshToken: _rt, ...clean } = user;
      this.currentUserSignal.set(clean as User);
      this.logger.debug('[AuthService] Token migrated from sessionStorage → memory');
    }
  }

  /**
   * Reads non-sensitive user metadata from sessionStorage (name, roles, employeeId etc.).
   * The access token is NOT stored in sessionStorage — it lives in _accessToken (memory only).
   * Returns null if no session exists.
   */
  private getInitialUser(): User | null {
    const storedUser = sessionStorage.getItem('currentUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }

  /** Persist non-sensitive user metadata to sessionStorage, stripping the token. */
  private storeUserMetadata(user: User): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token: _stripped, refreshToken: _rt, ...metadata } = user;
    sessionStorage.setItem('currentUser', JSON.stringify(metadata));
  }

  public get currentUserValue(): User | null {
    return this.currentUserSignal();
  }

  /** Returns the in-memory access token. Null on page reload until silent refresh completes. */
  getToken(): string | null {
    return this._accessToken;
  }

  /** Refresh token is stored as httpOnly cookie — not accessible via JS */
  getRefreshToken(): string | null {
    return null; // Intentionally null — browser sends cookie automatically
  }

  // Register
  register(userData: RegisterData): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/register`, userData);
  }

  // Login — access token stored in memory only; refresh token received as httpOnly cookie
  login(loginData: LoginCredentials): Observable<LoginSuccessData> {
    return this.http.post<ApiResponse<LoginSuccessData>>(`${this.apiUrl}/login`, loginData, { withCredentials: true }).pipe(
      map(response => response.data),
      tap(data => {
        const token = data.accessToken;
        if (!token) return;

        this.logger.debug('Login response received', { expiresIn: data.expiresIn, userId: data.user?.id });

        const user: User = {
          id:                 data.user.id,
          username:           data.user.username,
          email:              data.user.email,
          fullName:           data.user.fullName,
          // token intentionally NOT set — lives in _accessToken (memory only)
          roles:              data.user.roles?.length ? data.user.roles : ['User'],
          avatar:             'assets/images/defaults/avatar-1.png',
          employeeId:         data.user.employeeId,
          mustChangePassword: data.user.mustChangePassword
        };

        // Store access token in memory (not sessionStorage)
        this._accessToken = token;

        this.logger.debug('User object created (token in memory only)', user);
        this.storeUserMetadata(user);
        this.currentUserSignal.set(user);

        // Schedule proactive background refresh ~2 min before expiry
        this.scheduleProactiveRefresh(data.expiresIn);
      })
    );
  }

  logout(reason: string = 'session_expired') {
    // Clear in-memory token and cancel any scheduled refresh
    this._accessToken = null;
    this.cancelRefreshTimer();

    // Clear local state
    sessionStorage.removeItem('currentUser');
    this.currentUserSignal.set(null);
    this.isRefreshingSignal.set(false);
    this.refreshTokenSignal.set(null);

    // Fire-and-forget: clear httpOnly refresh token cookie on backend
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.router.navigate(['/login'], { queryParams: { reason } });
  }

  /**
   * Refresh the access token using the httpOnly refresh-token cookie.
   *
   * Two modes:
   *  - Normal (token in memory): sends current access token in body for validation.
   *  - Silent re-auth on page reload: _accessToken is null; sends empty string.
   *    The backend locates the user via the refresh-token hash alone.
   */
  refreshAccessToken(): Observable<string> {
    const currentToken = this._accessToken;
    const hasUserSession = this.currentUserValue !== null;

    // No token AND no user session — nothing to refresh.
    if (!currentToken && !hasUserSession) {
      this.logout();
      return throwError(() => new Error('No tokens available'));
    }

    if (this.isRefreshingSignal()) {
      // Another request already triggered a refresh — queue and wait using Promise
      return new Observable<string>(observer => {
        const checkInterval = setInterval(() => {
          if (!this.isRefreshingSignal()) {
            clearInterval(checkInterval);
            const token = this.refreshTokenSignal();
            if (token && token !== 'REFRESH_FAILED') {
              observer.next(token);
              observer.complete();
            } else {
              observer.error(new Error('Token refresh failed'));
            }
          }
        }, 100);
      });
    }

    this.isRefreshingSignal.set(true);
    this.refreshTokenSignal.set(null);

    // Send current token (or empty string for silent page-reload refresh)
    return this.http.post<ApiResponse<RefreshSuccessData>>(
      `${this.apiUrl}/refresh-token`,
      { accessToken: currentToken ?? '' },
      { withCredentials: true }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const newAccessToken = data.accessToken;

        // Update in-memory token
        this._accessToken = newAccessToken;

        // Update stored user metadata (no token in storage)
        const user = this.currentUserValue;
        if (user) {
          this.storeUserMetadata(user);
          this.currentUserSignal.set(user);
        }

        this.isRefreshingSignal.set(false);
        this.refreshTokenSignal.set(newAccessToken);
        this.logger.debug('Token refreshed successfully');

        // Re-schedule proactive refresh
        this.scheduleProactiveRefresh(data.expiresIn);
      }),
      map(data => data.accessToken as string),
      catchError(err => {
        this.isRefreshingSignal.set(false);
        this.refreshTokenSignal.set('REFRESH_FAILED');
        this.refreshTokenSignal.set(null); // Reset for next cycle
        this.logger.error('Token refresh failed', err);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  /**
   * Schedule a background token refresh ~2 minutes before the access token expires.
   * @param expiresInSeconds - token lifetime from the server response (seconds)
   */
  private scheduleProactiveRefresh(expiresInSeconds: number): void {
    this.cancelRefreshTimer();
    const twoMinutesMs = 2 * 60 * 1000;
    const refreshInMs = Math.max((expiresInSeconds * 1000) - twoMinutesMs, 0);

    this.logger.debug(`Proactive refresh scheduled in ${Math.round(refreshInMs / 1000)}s`);

    this._refreshTimer = setTimeout(() => {
      this.logger.debug('Proactive refresh triggered');
      this.refreshAccessToken().pipe(
        catchError(err => {
          // Ignore — logout is already called inside refreshAccessToken on failure
          this.logger.warn('Proactive refresh failed', err);
          return of(null);
        })
      ).subscribe();
    }, refreshInMs);
  }

  private cancelRefreshTimer(): void {
    if (this._refreshTimer !== null) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  /**
   * Check if the token is about to expire (within 2 minutes).
   */
  isTokenExpiringSoon(): boolean {
    if (!this._accessToken) return true;

    const decoded = this.decodeJwtToken(this._accessToken);
    if (!decoded.exp) return false;

    const expiresAt = decoded.exp * 1000;
    const twoMinutes = 2 * 60 * 1000;
    return expiresAt - Date.now() < twoMinutes;
  }

  /** Whether a refresh is currently in progress */
  get isRefreshInProgress(): boolean {
    return this.isRefreshingSignal();
  }

  /** Observable that emits when refresh completes */
  get onRefreshComplete(): Observable<string | null> {
    // Convert Signal to Observable for backward compatibility
    return new Observable<string | null>(observer => {
      const checkInterval = setInterval(() => {
        if (!this.isRefreshingSignal()) {
          clearInterval(checkInterval);
          observer.next(this.refreshTokenSignal());
          observer.complete();
        }
      }, 100);
    });
  }

  /**
   * Change the current user's password. On success, clears the mustChangePassword flag.
   */
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword
    }).pipe(
      map(response => response.data as unknown as void),
      tap(() => {
        const user = this.currentUserValue;
        if (user?.mustChangePassword) {
          const updatedUser: User = { ...user, mustChangePassword: false };
          this.storeUserMetadata(updatedUser);
          this.currentUserSignal.set(updatedUser);
        }
      })
    );
  }

  /**
   * Sends a password-reset email. Always succeeds publicly to avoid email enumeration.
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      map(r => r.data as unknown as void)
    );
  }

  /**
   * Resets the user's password using the token received by email.
   */
  resetPassword(
    email: string,
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/reset-password`, {
      email,
      token,
      newPassword,
      confirmPassword
    }).pipe(
      map(r => r.data as unknown as void)
    );
  }

  getAllUsers(pageNumber: number = 1, pageSize: number = 20, searchTerm: string = ''): Observable<PagedResult<User>> {
    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', pageSize.toString());

    if (searchTerm) {
      params = params.set('SearchTerm', searchTerm);
    }

    return this.http.get<ApiResponse<PagedResult<User>>>(`${this.apiUrl}/users`, { params }).pipe(
      map(response => response.data),
      catchError(error => {
        this.logger.error('Error fetching users', error);
        return throwError(() => error);
      })
    );
  }

  updateUserRoles(userId: string, roles: string[]): Observable<void> {
      return this.http.put<ApiResponse<void>>(`${this.apiUrl}/roles/${userId}`, { Roles: roles }).pipe(
        map(response => response.data)
      );
  }

  getRoles(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/roles`).pipe(
      map(response => response.data || [])
    );
  }

  isLoggedIn(): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // If no in-memory token (e.g. page reload), treat the user as logged in and
    // let the JWT interceptor trigger a silent refresh on the first API call.
    if (!this._accessToken) return true;

    const decoded = this.decodeJwtToken(this._accessToken);
    if (!decoded.exp) return true;

    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      // Access token expired — interceptor will handle refresh on next API call.
      this.logger.warn('Access token expired – interceptor will refresh on next request');
    }
    return true; // Always let the interceptor attempt refresh
  }

  // ✅ Helper to decode JWT token
  private decodeJwtToken(token: string): JwtPayload {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      this.logger.error('Failed to decode JWT token', error);
      return {};
    }
  }
}
