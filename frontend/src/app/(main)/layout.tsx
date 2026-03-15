"use client";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthGuard } from "@/components/layout/auth-guard";
import { useNotificationStore } from "@/stores/notification-store";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg">
        <main>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
