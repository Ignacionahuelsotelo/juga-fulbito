"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, UserPlus, Check, Users } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
import { POSITIONS } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface SearchPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string | null;
  skill_level: string | null;
  rating_avg: number;
  distance_km?: number;
}

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState("");
  const { position: geoPos, requestPosition } = useGeolocation();

  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  useEffect(() => {
    searchPlayers();
  }, [geoPos]);

  const searchPlayers = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { radius_km: 15 };
      if (geoPos) {
        params.latitude = geoPos.latitude;
        params.longitude = geoPos.longitude;
      }
      const res = await api.get("/availability/search", { params });
      setPlayers(res.data.items || res.data || []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const invitePlayer = async (userId: string) => {
    setInviting(userId);
    try {
      await api.post(`/matches/${id}/invite`, { player_id: userId });
      setInvited((prev) => new Set(prev).add(userId));
      toast.success("Invitacion enviada!");
    } catch {
      toast.error("Error al invitar");
    } finally {
      setInviting("");
    }
  };

  const inviteAll = async () => {
    const ids = players.map((p) => p.user_id).filter((uid) => !invited.has(uid));
    if (ids.length === 0) return;
    setLoading(true);
    try {
      await api.post(`/matches/${id}/invite/bulk`, { player_ids: ids });
      setInvited(new Set(ids));
      toast.success(`${ids.length} invitaciones enviadas!`);
    } catch {
      toast.error("Error al invitar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Invitar jugadores" showBack />
      <div className="page-container">
        <p className="text-sm text-text-secondary mb-4">
          Jugadores disponibles cerca de la cancha
        </p>

        {players.length > 1 && (
          <button
            onClick={inviteAll}
            disabled={loading}
            className="btn-secondary w-full mb-4 flex items-center justify-center gap-2"
          >
            <Users size={16} /> Invitar a todos ({players.length})
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : players.length > 0 ? (
          <div className="space-y-2">
            {players.map((player) => {
              const isInvited = invited.has(player.user_id);
              return (
                <div key={player.user_id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={player.avatar_url} name={player.display_name} />
                    <div>
                      <p className="font-semibold text-sm">{player.display_name}</p>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>{POSITIONS[player.position || ""] || "Sin posicion"}</span>
                        <span>&#11088; {Number(player.rating_avg).toFixed(1)}</span>
                        {player.distance_km && (
                          <span>{player.distance_km.toFixed(1)} km</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => invitePlayer(player.user_id)}
                    disabled={isInvited || inviting === player.user_id}
                    className={`p-2 rounded-xl transition-colors ${
                      isInvited
                        ? "bg-primary-50 text-primary-600"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                    }`}
                  >
                    {inviting === player.user_id ? (
                      <Spinner size={18} className="text-white" />
                    ) : isInvited ? (
                      <Check size={18} />
                    ) : (
                      <UserPlus size={18} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="No se encontraron jugadores disponibles cerca"
          />
        )}
      </div>
    </>
  );
}
