export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;       // e.g. 'LeaveApproved', 'LeaveRejected'
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
}
