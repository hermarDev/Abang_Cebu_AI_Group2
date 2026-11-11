"use client";

import { Modal } from "@/components/ui/Modal";
import { NotificationCenter } from "./NotificationCenter";
import { useNotificationCenter } from "./useNotificationCenter";

export interface NotificationsModalProps {
  userId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function NotificationsModal({ userId, open, onClose }: NotificationsModalProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotificationCenter(userId, Boolean(userId && open));

  if (!userId) return null;

  return (
    <Modal
      surface="finder"
      open={open}
      onClose={onClose}
      title="Notifications"
      hideTitle
      className="p-0 max-w-md overflow-hidden rounded-2xl"
    >
      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        onRefresh={() => void refresh(true)}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClose={onClose}
      />
    </Modal>
  );
}
