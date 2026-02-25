import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  uploadFile(file: File, folderName: string = 'general'): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    // Pass folderName as a query param or form field?
    // Handlers uses [FromForm], so let's append to formData
    formData.append('folderName', folderName);

    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/upload`, formData).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return response.data; // Return the path
        }
        throw new Error(response.message || 'Upload failed');
      })
    );
  }

  // Helper to get full URL for an uploaded file
  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Construct base URL by removing '/api' suffix from environment.apiUrl
    const baseUrl = environment.apiUrl.split('/api')[0];
    return `${baseUrl}${path}`;
  }
}
