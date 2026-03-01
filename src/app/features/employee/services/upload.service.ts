import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';

// ─────────────────────────────────────────────────────────────
// Upload constraints — enforced client-side before any HTTP call.
// The server performs its own validation as a second layer.
// ─────────────────────────────────────────────────────────────

export interface UploadConstraint {
  maxBytes: number;
  /** Allowed MIME types (checked against File.type). */
  allowedMimeTypes: readonly string[];
  /** Human-readable description shown in error messages. */
  label: string;
}

export const UPLOAD_CONSTRAINTS: Record<string, UploadConstraint> = {
  avatars: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'JPG / PNG / WebP, max 5 MB',
  },
  resumes: {
    maxBytes: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    label: 'PDF / DOC / DOCX, max 20 MB',
  },
  contracts: {
    maxBytes: 20 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    label: 'PDF / DOC / DOCX, max 20 MB',
  },
  general: {
    maxBytes: 20 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    label: 'PDF / DOC / DOCX / JPG / PNG / WebP, max 20 MB',
  },
};

export type UploadFolder = keyof typeof UPLOAD_CONSTRAINTS;

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly apiUrl = `${environment.apiUrl}/files`;

  /**
   * Trusted origins for absolute file URLs.
   * Includes the API server and Supabase Storage CDN.
   */
  private readonly trustedOrigins: string[] = (() => {
    const origins: string[] = [];
    try { origins.push(new URL(environment.apiUrl).origin); } catch { /* ignore */ }
    // Supabase Storage public URLs (*.supabase.co)
    origins.push('supabase.co');
    return origins;
  })();

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────
  // File validation
  // ─────────────────────────────────────────────

  /**
   * Validates a file against size and MIME-type constraints for the given folder.
   * Returns a human-readable error string, or null when the file is valid.
   */
  validateFile(file: File, folder: UploadFolder = 'general'): string | null {
    const constraint = UPLOAD_CONSTRAINTS[folder] ?? UPLOAD_CONSTRAINTS['general'];

    if (file.size > constraint.maxBytes) {
      const maxMb = Math.round(constraint.maxBytes / (1024 * 1024));
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${maxMb} MB.`;
    }

    if (!constraint.allowedMimeTypes.includes(file.type)) {
      return `File type "${file.type || 'unknown'}" is not allowed. Accepted: ${constraint.label}.`;
    }

    return null;
  }

  // ─────────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────────

  uploadFile(file: File, folderName: UploadFolder = 'general'): Observable<string> {
    // Client-side gate — server validates again as 2nd layer
    const validationError = this.validateFile(file, folderName);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderName', folderName);

    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/upload`, formData).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Upload failed');
      })
    );
  }

  // ─────────────────────────────────────────────
  // URL resolution
  // ─────────────────────────────────────────────

  /**
   * Returns a safe absolute URL for a stored file path.
   *
   * - Relative paths  (e.g. /uploads/avatars/file.jpg) are prefixed with
   *   the API server base URL.
   * - Absolute URLs are accepted when their origin matches the API server
   *   or a trusted cloud storage provider (Supabase).
   * - All other absolute URLs are rejected (returns '') to prevent
   *   open-redirect and javascript: injection attacks.
   */
  getFileUrl(path: string | undefined): string {
    if (!path) return '';

    if (!path.startsWith('http')) {
      // Relative server path (legacy local uploads)
      const baseUrl = environment.apiUrl.split('/api')[0];
      return `${baseUrl}${path}`;
    }

    // Absolute URL — accept from trusted origins only
    try {
      const url = new URL(path);
      const isTrusted = this.trustedOrigins.some(
        origin => url.origin === origin || url.hostname.endsWith(origin)
      );
      if (isTrusted) return path;
    } catch {
      // Malformed URL — fall through to empty return
    }

    return ''; // Reject foreign / malformed URLs
  }
}
