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

const devCsp: CspConfig = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com data:",
  'img-src': "'self' data: blob: https: https://upload.wikimedia.org",
  'connect-src': "'self' ws://localhost:* http://localhost:* https://localhost:* http://localhost:5055 https://localhost:5055",
  'worker-src': "'self' blob:",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'"
};

export const environment = {
  production: false,
  apiUrl: 'http://localhost:5055/api',
  csp: devCsp
};
