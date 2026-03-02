export interface DeptTreeNode {
  id: string;
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  managerCode?: string;
  employeeCount: number;
  children: DeptTreeNode[];
  // computed client-side
  level?: number;
  totalDescendants?: number;
}
