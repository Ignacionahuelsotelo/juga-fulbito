"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Send, ArrowDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth-store";
import { cn, timeAgo } from "@/lib/utils";
import api from "@/lib/api";

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string | null;
  content: string;
  created_at: string;
  // Legacy nested format
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

function getSenderName(msg: Message): string {
  return msg.sender_name || msg.sender?.display_name || "?";
}

function getSenderAvatar(msg: Message): string | null | undefined {
  return msg.sender_avatar ?? msg.sender?.avatar_url;
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Mark room as read
  const markAsRead = useCallback(async () => {
    try {
      await api.put(`/chat/rooms/${roomId}/read`);
    } catch {
      // silent
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages();
    connectWebSocket();
    markAsRead();
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/rooms/${roomId}/messages?limit=50`);
      const data = res.data;
      // Backend returns {messages: [...], has_more: bool}
      const msgs = data.messages || data.items || data || [];
      // Messages come in chronological order from backend
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = apiUrl.replace(/^https?:\/\//, "").replace(/\/api\/v1$/, "");
    const wsUrl = `${wsProtocol}://${wsHost}/api/v1/chat/ws/${roomId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // WebSocket sends {type: "new_message", data: {...}}
          const msg = payload.data || payload;
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read when receiving messages
          markAsRead();
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        // Fallback to polling
        pollRef.current = setInterval(loadMessages, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Fallback to polling
      pollRef.current = setInterval(loadMessages, 3000);
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;

    setSending(true);
    setNewMessage("");

    // Try WebSocket first
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      setSending(false);
    } else {
      // Fallback to HTTP
      try {
        const res = await api.post(`/chat/rooms/${roomId}/messages`, { content: text });
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      } catch {
        // restore message on error
        setNewMessage(text);
      } finally {
        setSending(false);
      }
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  return (
    <>
      <Header title="Chat" showBack />
      <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)]">
        {/* Messages */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-text-secondary">
                Se el primero en enviar un mensaje!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 animate-fade-in",
                    isMine ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!isMine && (
                    <Avatar
                      src={getSenderAvatar(msg)}
                      name={getSenderName(msg)}
                      size="sm"
                      className="flex-shrink-0 mt-1"
                    />
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2",
                      isMine
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    )}
                  >
                    {!isMine && (
                      <p className="text-[10px] font-semibold text-primary-600 mb-0.5">
                        {getSenderName(msg)}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isMine ? "text-primary-200" : "text-gray-400"
                      )}
                    >
                      {timeAgo(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-4 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center z-10"
          >
            <ArrowDown size={18} className="text-gray-600" />
          </button>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="input-field flex-1 !py-2.5 !rounded-full"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Spinner size={16} className="text-white" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
