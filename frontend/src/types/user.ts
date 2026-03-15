export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'mixed';
export type SkillLevel = 'beginner' | 'intermediate' | 'competitive';
export type PlayStyle = 'relaxed' | 'competitive' | 'physical';
export type DominantFoot = 'left' | 'right' | 'both';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  zone_name: string | null;
  latitude: number | null;
  longitude: number | null;
  position: Position | null;
  skill_level: SkillLevel | null;
  play_style: PlayStyle | null;
  dominant_foot: DominantFoot | null;
  bio: string | null;
  rating_avg: number;
  matches_played: number;
  tags: string[];
}

export interface ProfileUpdate {
  display_name?: string;
  age?: number;
  zone_name?: string;
  latitude?: number;
  longitude?: number;
  position?: Position;
  skill_level?: SkillLevel;
  play_style?: PlayStyle;
  dominant_foot?: DominantFoot;
  bio?: string;
}

export interface PlayerSearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  position: Position;
  skill_level: SkillLevel;
  play_style: PlayStyle;
  rating_avg: number;
  distance_km: number;
  availability_slot_id: string;
}
