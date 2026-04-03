interface CspConfig {
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

const prodCsp: CspConfig = {
  'default-src': "'self'",
  'script-src': "'self' https://vercel.live",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com data: https://*.vercel.app",
  'img-src':
    "'self' data: blob: https: https://images.unsplash.com https://i.pravatar.cc https://upload.wikimedia.org https://*.supabase.co https://*.onrender.com",
  'connect-src':
    "'self' https://hrms-backend-api-n0bq.onrender.com https://*.onrender.com https://vercel.live https://*.vercel.app",
  'worker-src': "'self' blob:",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'"
};

/**
 * Production environment configuration.
 *
 * API URL: Set this via your deployment platform's environment variables
 * (e.g., Vercel, Netlify, Render) — do NOT commit real production URLs to
 * source control.  Replace the placeholder below with an environment variable
 * reference, e.g.:
 *
 *   apiUrl: (window as any).__env?.PRODUCTION_API_URL ?? 'https://your-production-api.com/api'
 *
 * or use a .env file loaded at build time (see Angular docs on "build
 * configuration environments").
 *
 * CSP: is built per-environment — development uses localhost URLs,
 * production uses the live domain allowlist above. The CspService applies
 * the CSP from this config to the <meta> tag at runtime, overriding the
 * static index.html placeholder.
 */
const runtimeApiUrl =
  typeof window !== 'undefined'
    ? (window as any).__env?.PRODUCTION_API_URL
    : undefined;

export const environment = {
  production: true,
  // TODO: load from environment variable at build/deploy time
  apiUrl: runtimeApiUrl ?? 'https://your-production-api.com/api',
  csp: prodCsp
};
