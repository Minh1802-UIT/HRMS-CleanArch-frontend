export interface OrgNode {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  departmentId?: string;
  isMatch?: boolean;
  children: OrgNode[];
}
