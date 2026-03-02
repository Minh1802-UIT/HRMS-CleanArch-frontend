import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';
import { DepartmentService, Department } from '@features/organization/services/department.service';
import { OrgNode } from '@features/employee/models/org-node.model';


@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [NgClass, DecimalPipe, FormsModule, RouterModule, NgTemplateOutlet],
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgChartComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  zoomLevel: number = 1;
  loading: boolean = false;
  orgData: OrgNode | null = null;
  rawOrgData: OrgNode | null = null; // Store raw root for client-side filtering
  isFiltering: boolean = false;
  matchCount: number = 0;
  
  departments: Department[] = [];
  selectedDepartmentId: string = '';
  errorMessage: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDepartments();
    this.loadOrgChart();
  }

    loadDepartments() {
      this.departmentService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
        next: depts => {
          this.departments = depts;
          this.cdr.markForCheck();
        },
        error: (err: any) => this.toast.showError('Load Error', err?.error?.message || 'Failed to load departments')
      });
    }

  loadOrgChart() {
    this.loading = true;
    this.employeeService.getOrgChart().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
            if (data.length === 1) {
                this.rawOrgData = data[0]; // Cây có duy nhất 1 node gốc (vd: CEO)
            } else {
                // Có nhiều người không có Manager, tạo 1 node ảo để chứa tất cả
                this.rawOrgData = {
                    id: 'root-company',
                    name: 'Company',
                    title: 'Organization Hierarchy',
                    avatarUrl: '', // Avatar rỗng sẽ hiện dummy avatar
                    children: data,
                } as OrgNode;
            }
            this.applyFilters();
        } else {
            this.rawOrgData = null;
            this.orgData = null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.showError('Load Error', err?.error?.message || 'Failed to load organizational chart');
        this.errorMessage = 'Failed to load organizational chart.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDepartmentChange() {
      this.zoomLevel = 1;
      this.applyFilters();
  }

  onSearch() {
      this.applyFilters();
  }

  applyFilters() {
      // Nếu không có dữ liệu gốc, bỏ qua
      if (!this.rawOrgData) {
          this.orgData = null;
          this.isFiltering = false;
          this.matchCount = 0;
          return;
      }

      const hasSearch = !!this.searchTerm && this.searchTerm.trim().length > 0;
      const hasDept = !!this.selectedDepartmentId;
      
      this.isFiltering = hasSearch || hasDept;
      this.matchCount = 0;

      if (!this.isFiltering) {
          this.orgData = null;
          return;
      }

      const clonedRoot = JSON.parse(JSON.stringify(this.rawOrgData)) as OrgNode;

      if (hasDept && !hasSearch) {
          // Department-only: prune tree to only that department's nodes
          const filteredRoot = this.filterTreeNode(clonedRoot, '', this.selectedDepartmentId);
          this.orgData = filteredRoot;
          if (filteredRoot) this.matchCount = this.countMatches(filteredRoot);
      } else {
          // Search active (with or without dept): show FULL tree, just highlight matches
          // This preserves hierarchy context so users can see where the person sits in the org
          this.markMatchingNodes(clonedRoot, this.searchTerm.trim().toLowerCase(), this.selectedDepartmentId);
          this.orgData = clonedRoot;
          this.matchCount = this.countMatches(clonedRoot);
      }
      this.cdr.markForCheck();
  }

  /**
   * Traverses the FULL tree (no pruning) and marks each node with:
   *   isMatch            — this node itself matches the search
   *   hasMatchInSubtree  — this node or any descendant matches (used to highlight ancestor path)
   */
  markMatchingNodes(node: OrgNode, searchWord: string, deptId: string): boolean {
      let matchSearch = !searchWord ||
          node.name.toLowerCase().includes(searchWord) ||
          (node.title ? node.title.toLowerCase().includes(searchWord) : false);

      let matchDept = !deptId || node.departmentId === deptId;

      node.isMatch = matchSearch && matchDept;

      let anyDescendantMatch = false;
      if (node.children && node.children.length > 0) {
          for (const child of node.children) {
              if (this.markMatchingNodes(child, searchWord, deptId)) {
                  anyDescendantMatch = true;
              }
          }
      }

      node.hasMatchInSubtree = node.isMatch || anyDescendantMatch;
      return node.hasMatchInSubtree;
  }

  /** Count nodes where isMatch === true */
  countMatches(node: OrgNode): number {
      let count = node.isMatch ? 1 : 0;
      if (node.children) {
          for (const child of node.children) count += this.countMatches(child);
      }
      return count;
  }

  /**
   * Đệ quy cắt tỉa cây — dùng CHỈ cho lọc theo phòng ban (không có search).
   * Giữ lại node nếu node đó khớp HOẶC có ít nhất 1 node con bên dưới khớp.
   */
  filterTreeNode(node: OrgNode, searchWord: string, deptId: string): OrgNode | null {
      let matchSearch = true;
      let matchDept = true;

      if (searchWord) {
          matchSearch = node.name.toLowerCase().includes(searchWord) || 
                        (node.title ? node.title.toLowerCase().includes(searchWord) : false);
      }
      
      if (deptId) {
          matchDept = node.departmentId === deptId;
      }

      const isSelfMatch = matchSearch && matchDept;
      node.isMatch = isSelfMatch;
      node.hasMatchInSubtree = isSelfMatch;

      let filteredChildren: OrgNode[] = [];
      if (node.children && node.children.length > 0) {
          for (let child of node.children) {
              const result = this.filterTreeNode(child, searchWord, deptId);
              if (result) {
                  filteredChildren.push(result);
                  node.hasMatchInSubtree = true;
              }
          }
      }
      node.children = filteredChildren;

      if (isSelfMatch || filteredChildren.length > 0) {
          return node;
      }

      return null;
  }

  mapToOrgNode(node: OrgNode): OrgNode {
    return {
      id: node.id,
      name: node.name,
      title: node.title,
      avatarUrl: node.avatarUrl || '',
      children: (node.children || []).map((c: OrgNode) => this.mapToOrgNode(c))
    };
  }

  // toggleExpand removed as tree is now always expanded
  
  zoomIn() {
    if (this.zoomLevel < 1.5) {
      this.zoomLevel += 0.1;
    }
  }

  zoomOut() {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.1;
    }
  }

  trackByDeptId(index: number, dept: Department): string { return dept.id ?? String(index); }
  trackByIndex(index: number, item?: unknown): number { return index; }
}
