"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Star,
  Trophy,
  Target,
  UserPlus,
  Calendar,
  Check,
  Swords,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Modal } from "@/components/ui/modal";
import { getRatingLabel, formatDate, formatTime } from "@/lib/utils";
import { POSITIONS, SKILL_LEVELS, PLAY_STYLES, DOMINANT_FEET } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import toast from "react-hot-toast";

// Backend returns UserPublicResponse — flat object, NOT nested
interface PlayerProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  position: string | null;
  skill_level: string | null;
  play_style: string | null;
  dominant_foot?: string | null;
  bio: string | null;
  rating_avg: number;
  matches_played: number;
  zone_name: string | null;
  tags: Record<string, number> | null;
}

interface Rating {
  id: string;
  skill_score: number;
  punctuality_score: number;
  fair_play_score: number;
  attitude_score: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
}

interface MyMatch {
  id: string;
  organizer_id: string;
  venue_name: string | null;
  date: string;
  start_time: string;
  players_needed: number;
  confirmed_players_count: number;
  status: string;
  match_type: string;
}

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myMatches, setMyMatches] = useState<MyMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedMatches, setInvitedMatches] = useState<Set<string>>(new Set());
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    loadPlayer();
  }, [id]);

  const loadPlayer = async () => {
    try {
      const [playerRes, ratingsRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/ratings`),
      ]);
      setProfile(playerRes.data);
      setRatings(ratingsRes.data.items || ratingsRes.data || []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
    setLoadingMatches(true);
    try {
      // Get matches where I'm the organizer and status is open/full
      const res = await api.get("/matches/me");
      const matches = (res.data.items || res.data || []) as MyMatch[];
      // Only show matches I organize that are open or full
      const organizerMatches = matches.filter(
        (m: MyMatch) => m.organizer_id === user?.id && ["open", "full"].includes(m.status)
      );
      setMyMatches(organizerMatches);
    } catch {
      toast.error("Error al cargar partidos");
    } finally {
      setLoadingMatches(false);
    }
  };

  const inviteToMatch = async (matchId: string) => {
    setInviting(matchId);
    try {
      await api.post(`/matches/${matchId}/invite`, { player_id: id });
      toast.success(`${profile?.display_name} invitado!`);
      setInvitedMatches((prev) => new Set(prev).add(matchId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const detail = error.response?.data?.detail;
      if (detail?.includes("ya fue invitado") || detail?.includes("ya esta en")) {
        toast.error(detail);
        setInvitedMatches((prev) => new Set(prev).add(matchId));
      } else {
        toast.error("Error al invitar");
      }
    } finally {
      setInviting(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!profile) return null;

  const isOwnProfile = profile.user_id === user?.id;

  return (
    <>
      <Header title="Perfil de jugador" showBack />
      <div className="page-container">
        {/* Header */}
        <div className="text-center mb-6">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            className="mx-auto mb-3"
          />
          <h2 className="text-xl font-bold">{profile.display_name}</h2>
          {profile.zone_name && (
            <p className="text-sm text-text-secondary flex items-center justify-center gap-1 mt-1">
              <MapPin size={14} /> {profile.zone_name}
            </p>
          )}
          {profile.bio && <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>}
        </div>

        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={openInviteModal}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Invitar a partido
            </button>
            <button
              onClick={async () => {
                setStartingChat(true);
                try {
                  const res = await api.post("/chat/rooms/direct", { user_id: id });
                  router.push(`/chat/${res.data.id}`);
                } catch {
                  toast.error("Error al crear chat");
                } finally {
                  setStartingChat(false);
                }
              }}
              disabled={startingChat}
              className="btn-secondary flex items-center justify-center gap-2 !px-4"
            >
              {startingChat ? (
                <Spinner size={18} />
              ) : (
                <MessageCircle size={18} />
              )}
              Mensaje
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <Trophy size={18} className="text-amber-500 mx-auto mb-1" />
            <p className="font-bold">{profile.matches_played}</p>
            <p className="text-[10px] text-text-secondary">Partidos</p>
          </div>
          <div className="card text-center">
            <Star size={18} className="text-amber-500 mx-auto mb-1" />
            <p className="font-bold">{Number(profile.rating_avg).toFixed(1)}</p>
            <p className="text-[10px] text-text-secondary">
              {getRatingLabel(Number(profile.rating_avg))}
            </p>
          </div>
          <div className="card text-center">
            <Target size={18} className="text-primary-500 mx-auto mb-1" />
            <p className="font-bold text-sm">{POSITIONS[profile.position || ""] || "-"}</p>
            <p className="text-[10px] text-text-secondary">Posicion</p>
          </div>
        </div>

        {/* Info */}
        <div className="card mb-6">
          <h3 className="section-title !mb-3">Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nivel</span>
              <span className="font-medium">{SKILL_LEVELS[profile.skill_level || ""] || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estilo</span>
              <span className="font-medium">{PLAY_STYLES[profile.play_style || ""] || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pie</span>
              <span className="font-medium">{DOMINANT_FEET[profile.dominant_foot || ""] || "-"}</span>
            </div>
            {profile.age && (
              <div className="flex justify-between">
                <span className="text-gray-500">Edad</span>
                <span className="font-medium">{profile.age} anios</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {profile.tags && Object.keys(profile.tags).length > 0 && (
          <div className="card mb-6">
            <h3 className="section-title !mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.tags)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([tag, count]) => (
                  <span key={tag} className="badge-green">
                    {tag} ({count})
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Recent ratings */}
        {ratings.length > 0 && (
          <div className="mb-6">
            <h3 className="section-title">Ultimas calificaciones</h3>
            <div className="space-y-3">
              {ratings.slice(0, 5).map((rating) => (
                <div key={rating.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <StarRating
                      value={Math.round(
                        (rating.skill_score +
                          rating.punctuality_score +
                          rating.fair_play_score +
                          rating.attitude_score) /
                          4
                      )}
                      readonly
                      size={16}
                    />
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-gray-600">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title={`Invitar a ${profile.display_name}`}
        >
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Selecciona un partido para invitarlo:
            </p>

            {loadingMatches ? (
              <div className="flex justify-center py-6">
                <Spinner size={24} />
              </div>
            ) : myMatches.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {myMatches.map((match) => {
                  const alreadyInvited = invitedMatches.has(match.id);
                  return (
                    <div
                      key={match.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        alreadyInvited
                          ? "bg-green-50 border-green-200"
                          : "border-gray-200 hover:border-primary-300 hover:bg-primary-50/50"
                      }`}
                    >
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Swords size={16} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {match.venue_name || "Partido"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Calendar size={10} />
                          {formatDate(match.date)} {formatTime(match.start_time)}
                          <span>·</span>
                          <span>{match.confirmed_players_count}/{match.players_needed}</span>
                        </div>
                      </div>
                      {alreadyInvited ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <Check size={14} /> Invitado
                        </span>
                      ) : (
                        <button
                          onClick={() => inviteToMatch(match.id)}
                          disabled={inviting === match.id}
                          className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
                        >
                          {inviting === match.id ? (
                            <Spinner size={12} className="text-white" />
                          ) : (
                            <UserPlus size={12} />
                          )}
                          Invitar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Swords size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">
                  No tenes partidos abiertos donde seas organizador.
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Crea un partido primero para poder invitar jugadores.
                </p>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
