"use client";

import { Modal } from "@/components/ui/Modal";
import { NotificationCenter } from "./NotificationCenter";
import { useNotificationCenter } from "./useNotificationCenter";

export interface NotificationsModalProps {
  userId?: string | null;
  userRole?: "renter" | "landlord" | "admin" | null;
  open: boolean;
  onClose: () => void;
}

interface NotificationsModalContentProps {
  userId: string;
  userRole?: "renter" | "landlord" | "admin" | null;
  onClose: () => void;
}

/**
 * Inner content component mounted only when the modal is active.
 *
 * Mounting on open ensures `useNotificationCenter` initializes directly from the
 * existing shared user notification cache, preventing empty-list flicker.
 */
function NotificationsModalContent({ userId, userRole, onClose }: NotificationsModalContentProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useNotificationCenter(userId, true);

  return (
    <NotificationCenter
      className="max-h-[min(90dvh,38rem)] w-full border-0 shadow-none rounded-none"
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
      error={error}
      userRole={userRole}
      onRefresh={() => void refresh(true)}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onDeleteNotification={deleteNotification}
      onClearNotifications={clearNotifications}
      onClose={onClose}
    />
  );
}

/**
 * Displays the notification center within an accessible, viewport-bounded dialog.
 *
 * Keeps the dialog and its close controls accessible on mobile and short screens
 * by restricting height to the dynamic viewport and scrolling notification items internally.
 *
 * @param props - Component configuration properties including userId, open state, and close callback.
 * @returns The rendered modal dialog or null if no user is authenticated or dialog is closed.
 */
export function NotificationsModal({ userId, userRole, open, onClose }: NotificationsModalProps) {
  if (!userId || !open) return null;

  return (
    <Modal
      surface="finder"
      open={open}
      onClose={onClose}
      title="Notifications"
      hideTitle
      className="p-0 max-w-md w-full max-h-[min(90dvh,38rem)] flex flex-col overflow-hidden rounded-2xl"
    >
      <NotificationsModalContent userId={userId} userRole={userRole} onClose={onClose} />
    </Modal>
  );
}
