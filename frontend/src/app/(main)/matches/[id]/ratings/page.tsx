"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/stores/auth-store";
import { RATING_CATEGORIES } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface PlayerToRate {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface RatingForm {
  skill_score: number;
  punctuality_score: number;
  fair_play_score: number;
  attitude_score: number;
  comment: string;
}

export default function MatchRatingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [players, setPlayers] = useState<PlayerToRate[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [ratings, setRatings] = useState<RatingForm>({
    skill_score: 3,
    punctuality_score: 3,
    fair_play_score: 3,
    attitude_score: 3,
    comment: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadPending();
  }, [id]);

  const loadPending = async () => {
    try {
      const res = await api.get("/ratings/pending");
      const pending = (res.data.items || res.data || []).filter(
        (p: PlayerToRate & { match_id?: string }) =>
          p.user_id !== user?.id
      );
      setPlayers(pending);
      if (pending.length === 0) setDone(true);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    const player = players[currentIdx];
    if (!player) return;

    setSubmitting(true);
    try {
      await api.post("/ratings", {
        match_id: id,
        reviewed_id: player.user_id,
        ...ratings,
      });
      toast.success(`Calificaste a ${player.display_name}!`);

      if (currentIdx + 1 < players.length) {
        setCurrentIdx((prev) => prev + 1);
        setRatings({
          skill_score: 3,
          punctuality_score: 3,
          fair_play_score: 3,
          attitude_score: 3,
          comment: "",
        });
      } else {
        setDone(true);
      }
    } catch {
      toast.error("Error al calificar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size={32} className="mx-auto mt-20" />;

  const currentPlayer = players[currentIdx];

  return (
    <>
      <Header title="Calificar jugadores" showBack />
      <div className="page-container">
        {done ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Listo!</h2>
            <p className="text-text-secondary mb-6">
              Calificaste a todos los jugadores del partido
            </p>
            <button onClick={() => router.push(`/matches/${id}`)} className="btn-primary">
              Volver al partido
            </button>
          </div>
        ) : currentPlayer ? (
          <div className="animate-fade-in">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-secondary">
                {currentIdx + 1} de {players.length}
              </span>
              <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / players.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Player card */}
            <div className="text-center mb-6">
              <Avatar
                src={currentPlayer.avatar_url}
                name={currentPlayer.display_name}
                size="xl"
                className="mx-auto mb-3"
              />
              <h2 className="text-lg font-bold">{currentPlayer.display_name}</h2>
            </div>

            {/* Rating categories */}
            <div className="space-y-4 mb-6">
              {RATING_CATEGORIES.map((cat) => (
                <div key={cat.key} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{cat.label}</span>
                  </div>
                  <StarRating
                    value={ratings[cat.key as keyof RatingForm] as number}
                    onChange={(v) =>
                      setRatings((prev) => ({ ...prev, [cat.key]: v }))
                    }
                    size={28}
                  />
                </div>
              ))}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="label">Comentario (opcional)</label>
              <textarea
                value={ratings.comment}
                onChange={(e) =>
                  setRatings((prev) => ({ ...prev, comment: e.target.value }))
                }
                rows={2}
                className="input-field resize-none"
                placeholder="Buen jugador, muy crack..."
              />
            </div>

            <button
              onClick={handleSubmitRating}
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Spinner size={18} className="text-white" />
              ) : (
                <Send size={18} />
              )}
              {submitting ? "Enviando..." : "Enviar calificacion"}
            </button>
          </div>
        ) : (
          <EmptyState
            icon={Star}
            title="Sin jugadores"
            description="No hay jugadores pendientes de calificar"
          />
        )}
      </div>
    </>
  );
}
