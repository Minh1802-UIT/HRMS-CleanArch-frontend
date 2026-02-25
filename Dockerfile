# ============================================================
# Multi-stage Docker build — Angular 17 + nginx
# Stage 1: Node build (compile Angular to static files)
# Stage 2: nginx runtime (serve files + proxy /api to backend)
# ============================================================

# ── Stage 1: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (cached layer — only re-runs if package.json changes)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build production bundle
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Runtime (nginx) ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS final

# Remove default nginx config and replace with our SPA config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Angular build output (output path defined in angular.json)
COPY --from=build /app/dist/hrms-dashboard /usr/share/nginx/html

EXPOSE 80

# Liveness probe uses the /nginx-health endpoint (no backend dependency)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
