"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import api from "@/lib/api";

interface ChatRoom {
  id: string;
  type: string;
  match_id: string | null;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
  };
  members: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }[];
  unread_count?: number;
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const res = await api.get("/chat/rooms");
      setRooms(res.data.items || res.data || []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Chat" />
      <div className="page-container !pt-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : rooms.length > 0 ? (
          <div className="space-y-1">
            {rooms.map((room) => {
              const roomName =
                room.type === "match"
                  ? `Partido ${room.match_id?.slice(0, 6)}...`
                  : room.members?.[0]?.display_name || "Chat";
              const avatarName = room.members?.[0]?.display_name || roomName;
              const avatarSrc = room.members?.[0]?.avatar_url;

              return (
                <Link
                  key={room.id}
                  href={`/chat/${room.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {room.type === "match" ? (
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-primary-600" />
                    </div>
                  ) : (
                    <Avatar src={avatarSrc} name={avatarName} size="lg" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{roomName}</p>
                      {room.last_message && (
                        <span className="text-[10px] text-text-secondary flex-shrink-0">
                          {timeAgo(room.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {room.last_message ? (
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        <span className="font-medium">{room.last_message.sender_name}:</span>{" "}
                        {room.last_message.content}
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary mt-0.5">Sin mensajes</p>
                    )}
                  </div>
                  {room.unread_count && room.unread_count > 0 ? (
                    <span className="w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {room.unread_count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="Sin chats"
            description="Los chats se crean automaticamente cuando te unis a un partido"
          />
        )}
      </div>
    </>
  );
}
