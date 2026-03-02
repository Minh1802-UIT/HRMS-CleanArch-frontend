import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgTemplateOutlet, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '@core/services/toast.service';
import { DepartmentService, DeptTreeNode } from '@features/organization/services/department.service';

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [NgClass, FormsModule, NgTemplateOutlet, DecimalPipe],
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgChartComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  zoomLevel = 0.75;

  treeData: DeptTreeNode[] = [];
  selectedNode: DeptTreeNode | null = null;

  // Stats
  totalDepartments = 0;
  totalEmployees = 0;
  maxLevels = 0;
  avgTeamSize = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private deptService: DepartmentService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadTree(); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadTree() {
    this.loading = true;
    this.deptService.getDepartmentTree().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        data.forEach(root => this.annotate(root, 1));
        this.treeData = data;
        this.computeStats(data);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.showError('Load Error', err?.error?.message || 'Failed to load org chart');
        this.errorMessage = 'Failed to load organization chart.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private annotate(node: DeptTreeNode, level: number): number {
    node.level = level;
    let total = node.children.length;
    for (const child of node.children) total += this.annotate(child, level + 1);
    node.totalDescendants = total;
    return total;
  }

  private computeStats(roots: DeptTreeNode[]) {
    let deptCount = 0, empCount = 0, maxLvl = 0;
    const walk = (n: DeptTreeNode) => {
      deptCount++; empCount += n.employeeCount;
      if ((n.level ?? 1) > maxLvl) maxLvl = n.level ?? 1;
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    this.totalDepartments = deptCount;
    this.totalEmployees = empCount;
    this.maxLevels = maxLvl;
    this.avgTeamSize = deptCount > 0 ? Math.round(empCount / deptCount) : 0;
  }

  selectNode(node: DeptTreeNode) {
    this.selectedNode = this.selectedNode?.id === node.id ? null : node;
    this.cdr.markForCheck();
  }

  closePanel() { this.selectedNode = null; this.cdr.markForCheck(); }

  zoomIn()    { if (this.zoomLevel < 1.5) this.zoomLevel = +(this.zoomLevel + 0.1).toFixed(1); }
  zoomOut()   { if (this.zoomLevel > 0.3) this.zoomLevel = +(this.zoomLevel - 0.1).toFixed(1); }
  resetZoom() { this.zoomLevel = 0.75; }

  levelClass(level: number): string {
    return ['level-1','level-2','level-3','level-4','level-5'][Math.min(level - 1, 4)];
  }

  levelLabel(level: number): string {
    const map: Record<number, string> = { 1: 'C-Level', 2: 'Division', 3: 'Department', 4: 'Team', 5: 'Sub-Team' };
    return map[level] ?? `Level ${level}`;
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  trackByNode(_: number, node: DeptTreeNode): string { return node.id; }
}
