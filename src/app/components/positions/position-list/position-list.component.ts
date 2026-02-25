import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PositionService, PositionTreeNode } from '@features/organization/services/position.service';
import { ToastService } from '@core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PositionFormComponent } from '../position-form/position-form.component';
import { DepartmentService, Department } from '@features/organization/services/department.service';

// PositionTreeNode is imported from @features/organization/services/position.service

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [DecimalPipe, PositionFormComponent, FormsModule, NgTemplateOutlet],
  templateUrl: './position-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionListComponent implements OnInit, OnDestroy {
  positions: PositionTreeNode[] = [];
  treeData: PositionTreeNode[] = [];
  rawPositions: PositionTreeNode[] = []; // Store flat list for client-side filtering
  departments: Department[] = [];
  selectedDepartmentId: string = '';

  viewMode: 'list' | 'tree' = 'list';
  zoomLevel: number = 1;
  loading = true;
  showModal = false;
  selectedPositionId?: string;
  private destroy$ = new Subject<void>();

  constructor(
    private positionService: PositionService,
    private departmentService: DepartmentService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    // Load Departments
    this.departmentService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe((depts: Department[]) => {
      this.departments = depts;
      this.cdr.markForCheck();
    }, (err: any) => this.toast.showError('Load Error', err?.error?.message || 'Failed to load departments'));

    // Load Positions
    this.positionService.getPositions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (items) => {
        this.rawPositions = items as unknown as PositionTreeNode[];
        // Build initial full tree
        this.buildTreeFromFlat(items as unknown as PositionTreeNode[]);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
         this.toast.showError('Load Error', err?.error?.message || 'Failed to load positions, trying tree endpoint');
         // Fallback to tree endpoint if flat fails
         this.positionService.getPositionTree().pipe(takeUntil(this.destroy$)).subscribe((tree: PositionTreeNode[]) => {
           this.treeData = tree;
           this.positions = this.flattenTree(tree);
           this.loading = false;
           this.cdr.markForCheck();
         }, (treeErr: any) => {
           this.toast.showError('Load Error', treeErr?.error?.message || 'Failed to load position tree');
           this.loading = false;
           this.cdr.markForCheck();
         });
      }
    });
  }

  onDepartmentChange() {
      this.zoomLevel = 1;
      if (!this.selectedDepartmentId) {
          // Show All
          this.buildTreeFromFlat(this.rawPositions);
      } else {
          // Filter by Department
          const filtered = this.rawPositions.filter(p => p.departmentId === this.selectedDepartmentId);
          this.buildTreeFromFlat(filtered);
      }
  }

  buildTreeFromFlat(items: PositionTreeNode[]) {
      // 1. Map to TreeNodes
      const nodes: PositionTreeNode[] = items.map(i => ({...i, children: [], level: 0}));
      const nodeMap = new Map<string, PositionTreeNode>();
      nodes.forEach(n => nodeMap.set(n.id, n));

      const roots: PositionTreeNode[] = [];

      // 2. Build Hierarchy
      nodes.forEach(node => {
          if (node.parentId && nodeMap.has(node.parentId)) {
              const parent = nodeMap.get(node.parentId)!;
              parent.children = parent.children || [];
              parent.children.push(node);
          } else {
              roots.push(node);
          }
      });

      this.treeData = roots;
      this.positions = this.flattenTree(roots);
  }

  setViewMode(mode: 'list' | 'tree') {
    this.viewMode = mode;
    this.zoomLevel = 1; // Reset zoom when switching
  }

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

  // Helper to flatten recursive tree into linear list with levels
  flattenTree(nodes: PositionTreeNode[], level: number = 0): PositionTreeNode[] {
    let result: PositionTreeNode[] = [];
    for (const node of nodes) {
      result.push({ ...node, level });
      if (node.children && node.children.length > 0) {
        result = result.concat(this.flattenTree(node.children, level + 1));
      }
    }
    return result;
  }

  openAddModal() {
    this.selectedPositionId = undefined;
    this.showModal = true;
  }

  openEditModal(pos: PositionTreeNode) {
    this.selectedPositionId = pos.id;
    this.showModal = true;
  }

  deletePosition(pos: PositionTreeNode) {
    if (confirm(`Are you sure you want to delete ${pos.title}?`)) {
      this.positionService.deletePosition(pos.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toast.showSuccess('Success', 'Position deleted successfully');
          this.loadData();
        },
        error: (err: any) => {
          this.toast.showError('Error', err.error?.message || 'Failed to delete position');
        },
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedPositionId = undefined;
    this.loadData();
  }

  onSaved() {
    this.closeModal();
  }

  trackByDeptId(index: number, dept: Department): string { return dept.id ?? String(index); }
  trackByPosId(index: number, pos: PositionTreeNode): string { return pos.id; }
  trackByIndex(index: number, item?: unknown): number { return index; }
}
