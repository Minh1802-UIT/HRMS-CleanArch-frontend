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
   * The origin of the API server (e.g. "http://localhost:5055").
   * Used in getFileUrl() to reject absolute URLs from foreign origins.
   */
  private readonly apiOrigin: string = (() => {
    try { return new URL(environment.apiUrl).origin; } catch { return ''; }
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
   * - Absolute URLs are accepted ONLY when their origin matches the known
   *   API server origin.  All other absolute URLs are rejected and '' is
   *   returned — preventing open-redirect and javascript: injection attacks.
   */
  getFileUrl(path: string | undefined): string {
    if (!path) return '';

    if (!path.startsWith('http')) {
      // Relative server path
      const baseUrl = environment.apiUrl.split('/api')[0];
      return `${baseUrl}${path}`;
    }

    // Absolute URL — only accept from the known API origin
    try {
      const url = new URL(path);
      if (this.apiOrigin && url.origin === this.apiOrigin) {
        return path;
      }
    } catch {
      // Malformed URL — fall through to empty return
    }

    return ''; // Reject foreign / malformed URLs
  }
}
