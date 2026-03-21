import { api } from "@/lib/axios";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

export const notificationsApi = {
  // Get notifications
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.unreadOnly) searchParams.append("unreadOnly", "true");
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const response = await api.get(
      `/notifications?${searchParams.toString()}`
    );
    return response.data;
  },

  // Mark single notification as read
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch(`/notifications/${id}`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; updatedCount: number }> => {
    const response = await api.patch("/notifications");
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
