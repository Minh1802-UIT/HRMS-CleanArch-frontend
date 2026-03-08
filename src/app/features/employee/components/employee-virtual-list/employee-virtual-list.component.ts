import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Employee } from '@features/employee/services/employee.service';
import { UploadService } from '@features/employee/services/upload.service';

@Component({
  selector: 'app-employee-virtual-list',
  standalone: true,
  imports: [NgClass, RouterModule, NgOptimizedImage, ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cdk-virtual-scroll-viewport
      itemSize="72"
      class="h-full w-full"
    >
      <table class="min-w-full">
        <thead class="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
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
          @for (employee of employees; track employee.id) {
            <tr
              class="group transition-colors hover:bg-violet-50/30 dark:hover:bg-zinc-800/40 cursor-default"
              (mouseenter)="prefetch.emit(employee.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <img
                    [src]="getAvatarUrl(employee.avatarUrl) || 'assets/images/defaults/avatar-1.png'"
                    [alt]="employee.fullName"
                    class="w-9 h-9 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700 flex-shrink-0"
                    onerror="this.src='assets/images/defaults/avatar-1.png'"
                  />
                  <span class="text-sm font-semibold text-zinc-900 dark:text-white">{{ employee.fullName }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{{ employee.employeeCode }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-zinc-600 dark:text-zinc-300">{{ getPositionTitle(employee) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-zinc-600 dark:text-zinc-300">{{ getDepartmentName(employee) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [ngClass]="getEmploymentTypeClass(employee)" class="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full">
                  {{ getEmploymentType(employee) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a [routerLink]="['/employees', employee.id]" class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors" title="View Profile">
                  <span class="text-base material-symbols-outlined">arrow_outward</span>
                  View
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </cdk-virtual-scroll-viewport>

    @if (employees.length === 0) {
      <div class="py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <span class="text-3xl text-zinc-400 dark:text-zinc-600 material-symbols-outlined">group_off</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No employees found</p>
            <p class="text-xs text-zinc-400 mt-0.5">Try adjusting your search or filter criteria</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    cdk-virtual-scroll-viewport {
      height: 600px;
    }
  `]
})
export class EmployeeVirtualListComponent {
  private uploadService = inject(UploadService);
  private router = inject(Router);

  @Input() employees: Employee[] = [];
  @Input() deptMap: { [key: string]: string } = {};
  @Input() posMap: { [key: string]: string } = {};
  @Output() prefetch = new EventEmitter<string>();

  getAvatarUrl(path: string | undefined): string {
    return this.uploadService.getFileUrl(path) || '';
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
}
