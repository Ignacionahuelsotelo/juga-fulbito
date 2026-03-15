"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Swords,
  UserCheck,
  MessageCircle,
  Clock,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotificationStore } from "@/stores/notification-store";
import { cn, timeAgo } from "@/lib/utils";

interface NotificationData {
  match_id?: string;
  invitation_id?: string;
  chat_room_id?: string;
  [key: string]: string | undefined;
}

const typeIcons: Record<string, typeof Bell> = {
  invitation: Swords,
  acceptance: UserCheck,
  new_message: MessageCircle,
  match_reminder: Clock,
};

const typeColors: Record<string, string> = {
  invitation: "bg-amber-50 text-amber-600",
  acceptance: "bg-primary-50 text-primary-600",
  new_message: "bg-blue-50 text-blue-600",
  match_reminder: "bg-purple-50 text-purple-600",
};

function getNotificationLink(type: string, data: NotificationData | null): string | null {
  if (!data) return null;
  switch (type) {
    case "invitation":
    case "acceptance":
    case "match_reminder":
      return data.match_id ? `/matches/${data.match_id}` : null;
    case "new_message":
      return data.chat_room_id ? `/chat/${data.chat_room_id}` : "/chat";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unread = notifications.filter((n) => !n.is_read);

  const handleClick = (notif: { id: string; is_read: boolean; type: string; data: NotificationData | null }) => {
    if (!notif.is_read) markAsRead(notif.id);
    const link = getNotificationLink(notif.type, notif.data);
    if (link) router.push(link);
  };

  return (
    <>
      <Header
        title="Notificaciones"
        showBack
        rightAction={
          unread.length > 0 ? (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              <CheckCheck size={16} /> Leer todo
            </button>
          ) : null
        }
      />
      <div className="page-container !pt-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] || Bell;
              const colorClass = typeColors[notif.type] || "bg-gray-50 text-gray-600";
              const hasLink = !!getNotificationLink(notif.type, notif.data as NotificationData);

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif as { id: string; is_read: boolean; type: string; data: NotificationData | null })}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors",
                    notif.is_read ? "opacity-60" : "bg-primary-50/30 hover:bg-primary-50/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      colorClass
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{notif.title}</p>
                      <span className="text-[10px] text-text-secondary flex-shrink-0">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    {!notif.is_read && (
                      <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mt-1.5" />
                    )}
                  </div>
                  {hasLink && (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="Cuando tengas novedades van a aparecer aca"
          />
        )}
      </div>
    </>
  );
}
