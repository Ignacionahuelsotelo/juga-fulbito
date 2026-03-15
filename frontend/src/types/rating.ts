export interface Rating {
  id: string;
  match_id: string;
  reviewer_id: string;
  reviewed_id: string;
  skill_score: number;
  punctuality_score: number;
  fair_play_score: number;
  attitude_score: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string | null;
}

export interface PendingRatingPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  match_id: string;
  match_date: string;
}

export interface RatingCreate {
  match_id: string;
  reviewed_id: string;
  skill_score: number;
  punctuality_score: number;
  fair_play_score: number;
  attitude_score: number;
  comment?: string;
}

export interface RatingSummary {
  total_ratings: number;
  avg_skill: number;
  avg_punctuality: number;
  avg_fair_play: number;
  avg_attitude: number;
  overall_avg: number;
}
