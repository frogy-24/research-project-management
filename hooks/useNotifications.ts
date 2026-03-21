import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, Notification } from "@/api/notifications";
import { toast } from "sonner";

export function useNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  pollingInterval?: number;
}) {
  return useQuery({
    queryKey: ["notifications", options],
    queryFn: () => notificationsApi.getNotifications(options),
    refetchInterval: options?.pollingInterval || 30000, // Poll every 30 seconds by default
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (data.updatedCount > 0) {
        toast.success(`Marked ${data.updatedCount} notification(s) as read`);
      }
    },
    onError: () => {
      toast.error("Failed to mark notifications as read");
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
    onError: () => {
      toast.error("Failed to delete notification");
    },
  });
}
