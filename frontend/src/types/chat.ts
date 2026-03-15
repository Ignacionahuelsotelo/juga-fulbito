export type ChatRoomType = 'match' | 'direct';

export interface ChatRoom {
  id: string;
  match_id: string | null;
  type: ChatRoomType;
  created_at: string;
  last_message: ChatMessage | null;
  unread_count: number;
  members: ChatMember[];
}

export interface ChatMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}
