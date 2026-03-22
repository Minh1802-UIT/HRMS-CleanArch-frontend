import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CspConfig {
  'default-src': string;
  'script-src': string;
  'style-src': string;
  'font-src': string;
  'img-src': string;
  'connect-src': string;
  'worker-src': string;
  'object-src': string;
  'base-uri': string;
  'form-action': string;
}

@Injectable({ providedIn: 'root' })
export class CspService {
  private applied = false;

  /** Builds a CSP meta tag content value from a CspConfig object. */
  buildCspMetaContent(csp: CspConfig): string {
    return Object.entries(csp)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; ');
  }

  /** Applies the CSP from environment.csp to the document <meta> tag. */
  applyCsp(): void {
    if (this.applied || !environment.csp) return;
    this.applied = true;

    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement | null;
    if (meta) {
      meta.content = this.buildCspMetaContent(environment.csp);
    }
  }
}
