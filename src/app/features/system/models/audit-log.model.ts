export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues: string | null;
  newValues: string | null;
  createdAt: string;
}
