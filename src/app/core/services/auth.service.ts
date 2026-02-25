import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { tap, map, catchError, filter, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/api-response';
import { User, LoginCredentials, RegisterData, JwtPayload } from '../models/user.model';
import { LoggerService } from './logger.service';

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
  
  // State management with Signals
  private currentUserSignal = signal<User | null>(this.getInitialUser());
  public readonly user = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.user());

  // Backward compatibility with BehaviorSubject
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  // Refresh token state
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private logger: LoggerService
  ) {
    const user = this.currentUserSignal();
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  private getInitialUser(): User | null {
    // User metadata stored in sessionStorage (cleared on tab close)
    const storedUser = sessionStorage.getItem('currentUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    const user = this.currentUserValue;
    return user?.token || null;
  }

  /** Refresh token is stored as httpOnly cookie — not accessible via JS */
  getRefreshToken(): string | null {
    return null; // Intentionally null — browser sends cookie automatically
  }

  // Register
  register(userData: RegisterData): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/register`, userData);
  }

  // Login — access token stored in sessionStorage; refresh token received as httpOnly cookie
  login(loginData: LoginCredentials): Observable<LoginSuccessData> {
    return this.http.post<ApiResponse<LoginSuccessData>>(`${this.apiUrl}/login`, loginData, { withCredentials: true }).pipe(
      map(response => response.data),
      tap(data => {
        const token = data.accessToken;
        if (!token) return;

        this.logger.debug('Login response received', { expiresIn: data.expiresIn, userId: data.user?.id });

        // Trust the typed user object from the response body — no JWT claim digging needed.
        const user: User = {
          id:                 data.user.id,
          username:           data.user.username,
          email:              data.user.email,
          fullName:           data.user.fullName,
          token,
          // refreshToken intentionally NOT stored — lives in httpOnly cookie
          roles:              data.user.roles?.length ? data.user.roles : ['User'],
          avatar:             'assets/images/defaults/avatar-1.png',
          employeeId:         data.user.employeeId,
          mustChangePassword: data.user.mustChangePassword
        };

        this.logger.debug('User object created', user);
        // sessionStorage clears on tab close, unlike localStorage
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSignal.set(user);
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(reason: string = 'session_expired') {
    // Clear local state immediately
    sessionStorage.removeItem('currentUser');
    this.currentUserSignal.set(null);
    this.currentUserSubject.next(null);
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
    // Fire-and-forget: clear httpOnly refresh token cookie on backend
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe();
    this.router.navigate(['/login'], { queryParams: { reason } });
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Returns an Observable that emits the new access token on success.
   * Handles concurrent refresh requests by queuing them.
   */
  refreshAccessToken(): Observable<string> {
    const currentToken = this.getToken();

    if (!currentToken) {
      this.logout();
      return throwError(() => new Error('No tokens available'));
    }

    if (this.isRefreshing) {
      // Queue this request — wait until refreshTokenSubject emits a non-null value
      // Use switchMap to emit the token or propagate error on null (refresh failure)
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        map(token => token as string)
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    // withCredentials sends the httpOnly refresh token cookie automatically
    return this.http.post<ApiResponse<RefreshSuccessData>>(`${this.apiUrl}/refresh-token`,
      { accessToken: currentToken },
      { withCredentials: true }
    ).pipe(
      map(response => response.data),
      tap(data => {
        const newAccessToken = data.accessToken;

        // Update stored user with new access token
        const user = this.currentUserValue;
        if (user) {
          const updatedUser: User = { ...user, token: newAccessToken };
          sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSignal.set(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }

        this.isRefreshing = false;
        this.refreshTokenSubject.next(newAccessToken);
        this.logger.debug('Token refreshed successfully');
      }),
      map(data => data.accessToken as string),
      catchError(err => {
        this.isRefreshing = false;
        // Emit a sentinel value so queued requests unblock, then error out
        this.refreshTokenSubject.next('REFRESH_FAILED');
        this.refreshTokenSubject.next(null); // Reset for next cycle
        this.logger.error('Token refresh failed', err);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  /**
   * Check if the token is about to expire (within 2 minutes).
   */
  isTokenExpiringSoon(): boolean {
    const user = this.currentUserValue;
    if (!user?.token) return true;

    const decoded = this.decodeJwtToken(user.token);
    if (!decoded.exp) return false;

    const expiresAt = decoded.exp * 1000;
    const twoMinutes = 2 * 60 * 1000;
    return expiresAt - Date.now() < twoMinutes;
  }

  /** Whether a refresh is currently in progress */
  get isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /** Observable that emits when refresh completes */
  get onRefreshComplete(): Observable<string | null> {
    return this.refreshTokenSubject.asObservable();
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
          sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSignal.set(updatedUser);
          this.currentUserSubject.next(updatedUser);
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
    if (!user || !user.token) {
      return false;
    }

    const decoded = this.decodeJwtToken(user.token);
    if (!decoded.exp) {
      return true;
    }

    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      // The refresh token lives in an httpOnly cookie, so it is never accessible via
      // JavaScript. Do NOT check user.refreshToken here — it will always be absent.
      // Return true and let the JWT interceptor attempt the next API call; if the
      // server responds with 401 the interceptor will trigger /auth/refresh, which
      // sends the httpOnly cookie automatically. If refresh also fails, the interceptor
      // clears the session and redirects to login.
      this.logger.warn('Access token expired – interceptor will handle refresh on next request');
      return true;
    }

    return true;
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
