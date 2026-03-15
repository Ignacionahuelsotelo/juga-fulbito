export type MatchTypePref = 'competitive' | 'relaxed' | 'any';

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  zone_name: string | null;
  match_type_pref: MatchTypePref;
  is_active: boolean;
  created_at: string;
}

export interface AvailabilityCreate {
  date: string;
  start_time: string;
  end_time: string;
  zone_name?: string;
  latitude?: number;
  longitude?: number;
  match_type_pref: MatchTypePref;
}
