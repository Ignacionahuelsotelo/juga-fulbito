export type MatchType = 'competitive' | 'relaxed';
export type MatchStatus = 'open' | 'full' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Venue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
}

export interface Match {
  id: string;
  organizer_id: string;
  venue: Venue | null;
  venue_name: string | null;
  venue_address: string | null;
  date: string;
  start_time: string;
  duration_minutes: number;
  players_needed: number;
  match_type: MatchType;
  desired_level: string | null;
  status: MatchStatus;
  team_a: string[] | null;
  team_b: string[] | null;
  ai_explanation: string | null;
  created_at: string;
  confirmed_players_count: number;
}

export interface MatchCreate {
  date: string;
  start_time: string;
  duration_minutes: number;
  players_needed: number;
  match_type: MatchType;
  desired_level?: string;
  venue_id?: string;
  venue_name?: string;
  venue_address?: string;
  latitude?: number;
  longitude?: number;
}

export interface MatchInvitation {
  id: string;
  match_id: string;
  player_id: string;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
  match?: Match;
}

export interface MatchPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string | null;
  skill_level: string | null;
  rating_avg: number;
  team: string | null;
}

export interface BalanceResult {
  team_a: MatchPlayer[];
  team_b: MatchPlayer[];
  explanation: string;
  balance_score: number;
}
