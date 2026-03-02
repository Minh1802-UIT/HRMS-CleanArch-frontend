export interface OrgNode {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  departmentId?: string;
  isMatch?: boolean;
  hasMatchInSubtree?: boolean; // true if this node or any descendant matches the current search
  children: OrgNode[];
}
