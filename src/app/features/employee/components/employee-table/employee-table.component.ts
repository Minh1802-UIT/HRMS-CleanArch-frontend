import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgClass } from '@angular/common';
import { Employee } from '@features/employee/services/employee.service';
import { UploadService } from '@features/employee/services/upload.service';

@Component({
  selector: 'app-employee-table',
  standalone: true,
  imports: [NgClass, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto custom-scrollbar">
      <table class="min-w-full">
        <thead class="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800">
          <tr>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">Employee</th>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">ID</th>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">Job Title</th>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">Department</th>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">Type</th>
            <th scope="col" class="px-6 py-3.5 label-overline text-left text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
          @for (employee of employees; track trackByEmployeeId($index, employee)) {
            <tr
              class="group transition-all duration-200 hover:bg-violet-50/50 dark:hover:bg-zinc-800/50 cursor-default animate-fade-in"
              [style.animation-delay]="$index * 30 + 'ms'"
              (mouseenter)="prefetch.emit(employee.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <img
                    [src]="getAvatarUrl(employee.avatarUrl) || 'assets/images/defaults/avatar-1.png'"
                    [alt]="employee.fullName"
                    class="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-700 shadow-sm flex-shrink-0 transition-transform group-hover:scale-110"
                    onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjRmNGY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzdjM2FlZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPiYjOTg2MTs8L3RleHQ+PC9zdmc+'"
                  />
                  <span class="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{{ employee.fullName }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">{{ employee.employeeCode }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-zinc-600 dark:text-zinc-300">{{ getPositionTitle(employee) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-zinc-600 dark:text-zinc-300">{{ getDepartmentName(employee) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [ngClass]="getEmploymentTypeClass(employee)" class="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full">
                  {{ getEmploymentType(employee) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a [routerLink]="['/employees', employee.id]" class="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all hover:translate-x-0.5" title="View Profile">
                  <span class="text-base material-symbols-outlined">arrow_outward</span>
                  View
                </a>
              </td>
            </tr>
          }
          @if (employees.length === 0) {
            <tr>
              <td colspan="6" class="py-20 text-center">
                <div class="flex flex-col items-center gap-4 animate-fade-in-up">
                  <div class="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <span class="text-4xl text-violet-400 dark:text-violet-500 material-symbols-outlined">group_off</span>
                  </div>
                  <div>
                    <p class="text-base font-bold text-zinc-800 dark:text-zinc-200">No employees found</p>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Try adjusting your search or filter criteria</p>
                  </div>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class EmployeeTableComponent {
  private uploadService = inject(UploadService);
  private router = inject(Router);

  @Input() employees: Employee[] = [];
  @Input() deptMap: { [key: string]: string } = {};
  @Input() posMap: { [key: string]: string } = {};
  @Output() prefetch = new EventEmitter<string>();

  getAvatarUrl(path: string | undefined): string {
    return this.uploadService.getFileUrl(path) || 'assets/images/defaults/avatar-1.png';
  }

  getDepartmentName(employee: Employee): string {
    const name = employee.departmentName || employee.DepartmentName;
    if (name && name !== 'N/A') return name;
    const id = employee.jobDetails?.departmentId;
    if (id && this.deptMap[id]) return this.deptMap[id];
    return name || '-';
  }

  getPositionTitle(employee: Employee): string {
    const name = employee.positionName || employee.PositionName;
    if (name && name !== 'N/A') return name;
    const id = employee.jobDetails?.positionId;
    if (id && this.posMap[id]) return this.posMap[id];
    return name || '-';
  }

  getEmploymentType(employee: Employee): string {
    return employee.employmentType || employee.EmploymentType || employee.jobDetails?.['employmentType'] || 'Full time';
  }

  getEmploymentTypeClass(employee: Employee): string {
    const type = this.getEmploymentType(employee).toLowerCase();
    switch (type) {
      case 'full time':
      case 'full-time':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'part time':
      case 'part-time':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'contractor':
      case 'contract':
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }
}
