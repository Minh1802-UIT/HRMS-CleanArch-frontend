export const environment = {
  production: true,
  // Uses a relative path so the Angular app works behind a reverse proxy (nginx/IIS)
  // that routes /api/* to the backend on the same domain — no CORS required.
  // If the API lives on a different domain or port, set the full URL here or
  // inject it at build time via `--define` / CI environment variable substitution.
  apiUrl: '/api'
};
