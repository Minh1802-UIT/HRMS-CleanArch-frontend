/**
 * User model representing authenticated user
 */
export interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
  /** @deprecated Refresh token lives as httpOnly cookie — this field is unused */
  refreshToken?: string;
  roles?: string[];
  avatar?: string;
  employeeId?: string;
  fullName?: string;
  /** When true the user logged in with an auto-generated password and must set their own before proceeding. */
  mustChangePassword?: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

/**
 * Pagination request parameters used across paginated API calls.
 */
export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  isDescending?: boolean;
}

/**
 * Shape of a decoded JWT payload — all fields are optional because
 * different identity providers use different claim names.
 */
export interface JwtPayload {
  /** Standard subject claim */
  sub?: string;
  /** ASP.NET Core NameIdentifier claim */
  nameid?: string;
  unique_name?: string;
  name?: string;
  email?: string;
  /** Expiry as Unix timestamp (seconds) */
  exp?: number;
  /** Single role string or array of roles */
  role?: string | string[];
  /** Custom EmployeeId claim (PascalCase variant) */
  EmployeeId?: string;
  /** Custom employeeId claim (camelCase variant) */
  employeeId?: string;
  /** Allow any other standard or custom claims */
  [key: string]: unknown;
}
