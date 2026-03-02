import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PositionService, PositionTreeNode } from '@features/organization/services/position.service';
import { ToastService } from '@core/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PositionFormComponent } from '../position-form/position-form.component';
import { DepartmentService, Department } from '@features/organization/services/department.service';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [DecimalPipe, NgClass, PositionFormComponent, FormsModule, NgTemplateOutlet],
  templateUrl: './position-list.component.html',
  styleUrl: './position-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionListComponent implements OnInit, OnDestroy {
  positions: PositionTreeNode[] = [];
  treeData: PositionTreeNode[] = [];
  rawPositions: PositionTreeNode[] = [];
  departments: Department[] = [];
  selectedDepartmentId: string = '';
  searchQuery: string = '';

  // Stats
  totalPositions = 0;
  maxLevels = 0;
  uniqueDepts = 0;
  avgReports = 0;

  // UI state
  viewMode: 'list' | 'tree' = 'tree';
  zoomLevel = 0.9;
  loading = true;
  showModal = false;
  selectedPositionId?: string;
  selectedNode: PositionTreeNode | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private positionService: PositionService,
    private departmentService: DepartmentService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadData(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    this.departmentService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (depts: Department[]) => { this.departments = depts; this.cdr.markForCheck(); },
      error: (err: any) => this.toast.showError('Load Error', err?.error?.message || 'Failed to load departments')
    });

    this.positionService.getPositions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (items) => {
        this.rawPositions = items as unknown as PositionTreeNode[];
        this.buildTreeFromFlat(items as unknown as PositionTreeNode[]);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.positionService.getPositionTree().pipe(takeUntil(this.destroy$)).subscribe({
          next: (tree: PositionTreeNode[]) => {
            this.treeData = tree;
            this.annotate(this.treeData, 1);
            this.positions = this.flattenTree(tree);
            this.computeStats();
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.toast.showError('Load Error', err?.error?.message || 'Failed to load position tree');
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  onDepartmentChange() {
    this.selectedNode = null;
    this.zoomLevel = 0.9;
    this.applyFilters();
  }

  onSearchChange() {
    this.selectedNode = null;
    this.applyFilters();
  }

  applyFilters() {
    // Step 1: filter by department
    const byDept = this.selectedDepartmentId
      ? this.rawPositions.filter(p => p.departmentId === this.selectedDepartmentId)
      : this.rawPositions;

    // Step 2: build full tree from dept-filtered set
    this.buildTreeFromFlat(byDept);

    // Step 3: apply search on top (tree-aware — keeps ancestors of matches)
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      this.treeData = this.filterTreeByQuery(this.treeData, q);
      this.positions = this.positions.filter(p =>
        p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }
    this.cdr.markForCheck();
  }

  /** Returns a new tree keeping only nodes that match OR have a matching descendant. */
  filterTreeByQuery(nodes: PositionTreeNode[], q: string): PositionTreeNode[] {
    const result: PositionTreeNode[] = [];
    for (const node of nodes) {
      const filteredChildren = this.filterTreeByQuery(node.children ?? [], q);
      const selfMatches = node.title.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
      if (selfMatches || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
    return result;
  }

  buildTreeFromFlat(items: PositionTreeNode[]) {
    const nodes: PositionTreeNode[] = items.map(i => ({ ...i, children: [], level: 0 }));
    const nodeMap = new Map<string, PositionTreeNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));
    const roots: PositionTreeNode[] = [];
    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    this.treeData = roots;
    this.annotate(this.treeData, 1);
    this.positions = this.flattenTree(roots);
    this.computeStats();
  }

  annotate(nodes: PositionTreeNode[], level: number): void {
    for (const n of nodes) {
      n.level = level;
      if (n.children?.length) this.annotate(n.children, level + 1);
    }
  }

  computeStats() {
    this.totalPositions = this.positions.length;
    this.maxLevels = this.positions.reduce((m, p) => Math.max(m, (p.level ?? 0)), 0);
    this.uniqueDepts = new Set(this.rawPositions.map(p => p.departmentId).filter(Boolean)).size;
    const withChildren = this.positions.filter(p => (p.children?.length ?? 0) > 0);
    this.avgReports = withChildren.length
      ? Math.round(withChildren.reduce((s, p) => s + (p.children?.length ?? 0), 0) / withChildren.length)
      : 0;
  }

  flattenTree(nodes: PositionTreeNode[], level = 0): PositionTreeNode[] {
    let result: PositionTreeNode[] = [];
    for (const node of nodes) {
      result.push({ ...node, level });
      if (node.children?.length) result = result.concat(this.flattenTree(node.children, level + 1));
    }
    return result;
  }

  selectNode(node: PositionTreeNode) {
    this.selectedNode = this.selectedNode?.id === node.id ? null : node;
    this.cdr.markForCheck();
  }

  closePanel() { this.selectedNode = null; this.cdr.markForCheck(); }

  setViewMode(mode: 'list' | 'tree') { this.viewMode = mode; this.zoomLevel = 0.9; this.selectedNode = null; }
  zoomIn() { if (this.zoomLevel < 1.5) this.zoomLevel = +(this.zoomLevel + 0.1).toFixed(1); }
  zoomOut() { if (this.zoomLevel > 0.4) this.zoomLevel = +(this.zoomLevel - 0.1).toFixed(1); }
  resetZoom() { this.zoomLevel = 0.9; }

  levelClass(level: number): string {
    return ['level-1', 'level-2', 'level-3', 'level-4', 'level-5'][Math.min(level, 5) - 1] ?? 'level-5';
  }

  levelLabel(level: number): string {
    const labels: Record<number, string> = { 1: 'C-Suite', 2: 'Director', 3: 'Manager', 4: 'Lead', 5: 'IC' };
    return labels[Math.min(level, 5)] ?? 'Staff';
  }

  formatSalary(val?: number): string {
    if (!val) return '—';
    return val >= 1_000_000 ? (val / 1_000_000).toFixed(0) + 'M' : (val / 1_000).toFixed(0) + 'K';
  }

  openAddModal() { this.selectedPositionId = undefined; this.showModal = true; }
  openEditModal(pos: PositionTreeNode) { this.selectedPositionId = pos.id; this.showModal = true; }

  deletePosition(pos: PositionTreeNode) {
    if (confirm(`Delete "${pos.title}"?`)) {
      this.positionService.deletePosition(pos.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toast.showSuccess('Success', 'Position deleted'); this.loadData(); },
        error: (err: any) => this.toast.showError('Error', err.error?.message || 'Failed to delete')
      });
    }
  }

  closeModal() { this.showModal = false; this.selectedPositionId = undefined; this.loadData(); }
  onSaved() { this.closeModal(); }

  trackByDeptId(index: number, dept: Department): string { return dept.id ?? String(index); }
  trackByPosId(index: number, pos: PositionTreeNode): string { return pos.id; }
  trackByIndex(index: number): number { return index; }
}
