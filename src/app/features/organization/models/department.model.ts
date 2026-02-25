export interface Department {
  id?: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  // UI Metadata
  office?: string;
  status?: 'Active' | 'Restructuring' | 'Closed';
  totalEmployees?: number;
  headName?: string;
  headAvatar?: string;
}
