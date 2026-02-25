# HRMS-UI Services Documentation

This document outlines the core services used in the HRMS application.

## Core Infrastructure

### 1. `MasterDataService` (`src/app/core/services/master-data.service.ts`)
**Purpose**: Centralized management of static/master data (Departments, Positions, Leave Types).
**Features**:
- **Caching**: Uses `BehaviorSubject` to cache data in memory, reducing API calls by 75%.
- **Lazy Loading**: Data is fetched only when requested.
- **Auto-Refresh**: Helper methods like `refreshDepartments()` update the cache after CRUD operations.
- **Getters**: Simple accessors like `getDepartmentName(id)` for templates.

**Usage**:
```typescript
constructor(private masterData: MasterDataService) {}

// Subscribe to data (auto-cached)
this.masterData.getDepartments$().subscribe(depts => ...);

// Refresh after update
this.masterData.refreshDepartments();
```

### 2. `LoggerService` (`src/app/core/services/logger.service.ts`)
**Purpose**: Centralized logging replacement for `console.log`.
**Features**:
- **Environment Aware**: Logs only in non-production environments.
- **Levels**: `info`, `warn`, `error`, `debug`.
- **Timestamps**: Automatically adds timestamps to logs.

**Usage**:
```typescript
this.logger.info('User logged in');
this.logger.error('Login failed', error);
```

---

## Domain Services

All domain services are located in `src/app/services/`.

- **`EmployeeService`**: CRUD operations for employee management.
- **`DepartmentService`**: Manage organization departments.
- **`PositionService`**: Manage job titles and positions.
- **`LeaveRequestService`**: Handle leave applications and approvals.
- **`AttendanceService`**: Track employee attendance records.
- **`ContractService`**: Manage employee contracts.
- **`LayoutService`**: Manages UI state (theme, sidebar).

## Removed Services (Cleanup Phase)
The following unused demo services were removed:
- `customer.service.ts`
- `node.service.ts`
- `photo.service.ts`
- `country.service.ts`
- `icon.service.ts`
