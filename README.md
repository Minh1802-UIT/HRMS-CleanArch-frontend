<div align="center">

# HRMS UI

### Human Resource Management System — Frontend

Angular 17 SPA for the HRMS platform. HR management at your fingertips — attendance, payroll, leave, and recruitment in one dashboard.

[![CI - Frontend](https://img.shields.io/github/actions/workflow/status/Minh1802-UIT/HRMS-UI/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Minh1802-UIT/HRMS-UI/actions/workflows/ci.yml)
[![CD - Frontend](https://img.shields.io/github/actions/workflow/status/Minh1802-UIT/HRMS-UI/cd.yml?branch=main&label=CD&logo=githubactions&logoColor=white)](https://github.com/Minh1802-UIT/HRMS-UI/actions/workflows/cd.yml)
![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/license-MIT-blue)

[🚀 Live Demo](https://hrms-clean-arch-frontend.vercel.app) &nbsp;|&nbsp;
[🔧 Backend Repo](https://github.com/Minh1802-UIT/EmployeeCleanArch) &nbsp;|&nbsp;
[📖 API Docs](https://hrms-api.onrender.com/swagger)

</div>

---

## Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Environment Variables](#️-environment-variables)
- [🐳 Docker](#-docker)
- [🚢 Deployment](#-deployment)
- [📄 License](#-license)

---

## ✨ Features

| Module | Pages / Capabilities |
|---|---|
| **Authentication** | Login, Forgot Password, Reset Password, Force-change on first login |
| **Dashboard** | KPI cards, headcount chart, leave & recruitment summary |
| **Employee** | Employee list, Profile detail, Org Chart, Create/Edit employee |
| **Contract** | Contract list, Detail view, Self-service (view own contracts) |
| **Organization** | Department tree, Position management |
| **Attendance** | Check-in/Check-out with GPS map (Leaflet), Attendance history, Overtime |
| **Shift** | Shift configuration, Grace period, Overnight shift support |
| **Leave** | Leave types, Allocations, Submit request, Manager approval queue, Balance summary |
| **Payroll** | Payroll list, Payslip detail, PDF download, Excel bulk export |
| **Recruitment** | Job vacancies, Candidate pipeline (Applied → Hired), Interview scheduling, One-click onboarding |
| **Performance** | Goals with progress tracking, Period reviews with scoring |
| **Notifications** | In-app feed, Unread badge, Mark read / Read-all |
| **System** | Audit logs, User & Role management |

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 17.3.x | SPA framework |
| TypeScript | 5.4 | Language |
| PrimeNG | 17.18.x | UI component library |
| PrimeIcons | 7.0.0 | Icon set |
| Tailwind CSS | 3.4.x | Utility-first styling |
| Chart.js | 4.5.x | KPI dashboard charts |
| Leaflet | 1.9.x | GPS map for attendance check-in |
| RxJS | 7.8.x | Reactive state + HTTP streams |
| Angular CLI | 17.3.17 | Build & scaffolding tooling |

---

## 📁 Project Structure

```
HRMS-UI/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/          # Auth + role guards
│   │   │   ├── interceptors/    # JWT attach, error handling
│   │   │   ├── models/          # TypeScript interfaces / DTOs
│   │   │   └── services/        # Auth, notification, shared API services
│   │   ├── features/
│   │   │   ├── auth/            # Login, forgot/reset password
│   │   │   ├── dashboard/       # KPI overview
│   │   │   ├── employee/        # Employee CRUD, org chart
│   │   │   ├── attendance/      # Check-in/out, history
│   │   │   ├── leave/           # Leave requests, approvals, balances
│   │   │   ├── payroll/         # Payroll list, payslip, exports
│   │   │   ├── recruitment/     # Vacancies, candidates, interviews
│   │   │   ├── organization/    # Departments, positions, shifts
│   │   │   ├── performance/     # Goals, reviews
│   │   │   └── system/          # Audit logs, user/role management
│   │   ├── layout/
│   │   │   ├── navbar/          # Top navigation bar
│   │   │   ├── sidebar/         # Side menu
│   │   │   ├── footer/
│   │   │   └── main-layout/     # Shell layout component
│   │   └── shared/
│   │       ├── components/      # Reusable UI components
│   │       ├── directives/      # Custom directives
│   │       ├── pipes/           # Custom pipes
│   │       └── utils/           # Helper functions
│   ├── environments/
│   │   ├── environment.ts                # Development config
│   │   ├── environment.development.ts
│   │   └── environment.production.ts     # Production config
│   ├── assets/
│   │   ├── images/
│   │   ├── layout/              # SCSS layout partials
│   │   └── themes/              # PrimeNG theme overrides
│   └── styles.scss              # Global styles
├── nginx.conf                   # nginx config for Docker
├── Dockerfile                   # Multi-stage build (Node → nginx)
├── angular.json
├── tailwind.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Angular CLI | 17.x |

```bash
npm install -g @angular/cli@17
```

### 1. Clone the repository

```bash
git clone https://github.com/Minh1802-UIT/HRMS-UI.git
cd HRMS-UI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the API URL

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5055/api'  // point to your local backend
};
```

> The backend API must be running first. See the [EmployeeCleanArch repository](https://github.com/Minh1802-UIT/EmployeeCleanArch) for setup instructions.

### 4. Start the development server

```bash
npm start
```

App is available at: `http://localhost:4200`

---

## ⚙️ Environment Variables

The app uses Angular `environment.ts` files — no `.env` file required.

| File | Used when |
|---|---|
| `src/environments/environment.ts` | Local dev (`ng serve`) |
| `src/environments/environment.development.ts` | Development build override |
| `src/environments/environment.production.ts` | Production build (`ng build`) |

**Key property:**

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5055/api'
};
```

For production, update `environment.production.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://hrms-api.onrender.com/api'
};
```

---

## 🐳 Docker

Build and run the Angular app in an nginx container:

```bash
# Build
docker build -t hrms-ui .

# Run
docker run -p 80:80 hrms-ui
```

The `Dockerfile` uses a multi-stage build:
1. **Stage 1 (build):** `node:20-alpine` — installs deps and runs `ng build`
2. **Stage 2 (serve):** `nginx:alpine` — serves the `dist/` output via `nginx.conf`

To run the **full stack** (API + frontend + database + Redis):

```bash
# From the EmployeeCleanArch repo root
docker compose up --build
```

---

## 🚢 Deployment

The frontend is deployed on [Vercel](https://vercel.com).

**Build settings on Vercel:**

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist/hrms-dashboard/browser` |
| Install command | `npm install` |

Set `apiUrl` in `src/environments/environment.production.ts` before building, or configure it as a build-time replacement:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://hrms-api.onrender.com/api'
};
```

---

## 📄 License

This project is released under the **MIT License** — free for educational and portfolio use.

---

<div align="center">

Made with ❤️ using Angular 17 + PrimeNG &nbsp;·&nbsp; [Backend →](https://github.com/Minh1802-UIT/EmployeeCleanArch)

</div>
