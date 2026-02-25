export interface PositionTreeNode {
  id: string;
  title: string;
  code: string;
  level?: number;
  children?: PositionTreeNode[];
  departmentId?: string;
  parentId?: string;
}

export interface Position {
  id?: string;
  title: string;
  code: string;
  departmentId?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
}
