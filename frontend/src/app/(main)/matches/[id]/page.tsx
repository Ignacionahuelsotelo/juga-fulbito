"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UserPlus,
  Brain,
  Star,
  Shield,
  Swords,
  Play,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { Spinner, PageLoader } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { MapEmbed, GoogleMapsButton } from "@/components/ui/map-embed";
import {
  formatDate,
  formatTime,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { MATCH_TYPES, POSITIONS, SKILL_LEVELS } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface MatchDetail {
  id: string;
  organizer_id: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_address: string | null;
  date: string;
  start_time: string;
  duration_minutes: number;
  players_needed: number;
  match_type: string;
  desired_level: string | null;
  status: string;
  team_a: string[] | null;
  team_b: string[] | null;
  ai_explanation: string | null;
  created_at: string;
}

interface Player {
  id?: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string | null;
  skill_level: string | null;
  rating_avg: number;
  team: string | null;
}

interface Invitation {
  id: string;
  player_id: string;
  status: string;
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myInvitation, setMyInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showBalance, setShowBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{
    team_a: string[];
    team_b: string[];
    balance_score: number;
    explanation: string;
  } | null>(null);

  useEffect(() => {
    loadMatch();
  }, [id]);

  const loadMatch = async () => {
    setLoading(true);
    try {
      const [matchRes, invitesRes] = await Promise.all([
        api.get(`/matches/${id}`),
        api.get("/invitations/me"),
      ]);
      const matchData = matchRes.data;
      setMatch(matchData);
      // MatchDetailResponse includes players directly
      setPlayers(matchData.players || []);

      const invites = invitesRes.data.items || invitesRes.data || [];
      const inv = invites.find(
        (i: { player_id: string; match_id?: string; match?: { id: string } }) =>
          i.player_id === user?.id &&
          (i.match_id === id || i.match?.id === id)
      );
      setMyInvitation(inv || null);
    } catch {
      toast.error("Error al cargar partido");
    } finally {
      setLoading(false);
    }
  };

  const isOrganizer = match?.organizer_id === user?.id;
  const isPlayer = players.some((p) => p.user_id === user?.id);

  const handleAcceptInvite = async () => {
    if (!myInvitation) return;
    setActionLoading("accept");
    try {
      await api.put(`/invitations/${myInvitation.id}/accept`);
      toast.success("Invitacion aceptada!");
      loadMatch();
    } catch {
      toast.error("Error al aceptar");
    } finally {
      setActionLoading("");
    }
  };

  const handleRejectInvite = async () => {
    if (!myInvitation) return;
    setActionLoading("reject");
    try {
      await api.put(`/invitations/${myInvitation.id}/reject`);
      toast.success("Invitacion rechazada");
      loadMatch();
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setActionLoading("");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setActionLoading(status);
    try {
      await api.put(`/matches/${id}/status`, { status });
      toast.success("Estado actualizado!");
      loadMatch();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setActionLoading("");
    }
  };

  const handleBalance = async () => {
    setActionLoading("balance");
    try {
      const res = await api.post(`/matches/${id}/balance`);
      setBalanceResult(res.data);
      setShowBalance(true);
      loadMatch();
    } catch {
      toast.error("Error al balancear equipos");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) return <PageLoader />;
  if (!match) return null;

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");
  const unassigned = players.filter((p) => !p.team);

  return (
    <>
      <Header title="Detalle del partido" showBack />
      <div className="page-container">
        {/* Match header card */}
        <div className="gradient-header -mx-4 -mt-4 px-6 pt-6 pb-6 rounded-b-3xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`${getStatusColor(match.status)} !text-sm`}>
              {getStatusLabel(match.status)}
            </span>
            <span className="text-primary-200 text-sm">
              {MATCH_TYPES[match.match_type] || match.match_type}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-3">
            {match.venue_name || "Cancha por definir"}
          </h2>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary-100 text-sm">
              <Calendar size={16} /> {formatDate(match.date)}
            </div>
            <div className="flex items-center gap-2 text-primary-100 text-sm">
              <Clock size={16} /> {formatTime(match.start_time)} - {match.duration_minutes} min
            </div>
            {match.venue_address && (
              <div className="flex items-center gap-2 text-primary-100 text-sm">
                <MapPin size={16} /> {match.venue_address}
              </div>
            )}
            <div className="flex items-center gap-2 text-primary-100 text-sm">
              <Users size={16} /> {players.length} / {match.players_needed} jugadores
            </div>
          </div>
        </div>

        {/* Venue map */}
        {match.venue_address && (
          <div className="card mb-4">
            <h3 className="section-title !mb-2">Ubicacion de la cancha</h3>
            <MapEmbed
              latitude={null}
              longitude={null}
              height="180px"
              showMarker={false}
              label={match.venue_name || match.venue_address}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-text-secondary truncate flex-1">
                {match.venue_address}
              </p>
              <GoogleMapsButton
                name={match.venue_name}
                address={match.venue_address}
              />
            </div>
          </div>
        )}

        {/* Pending invitation */}
        {myInvitation && myInvitation.status === "pending" && (
          <div className="card border-amber-200 bg-amber-50 mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-3">
              Te invitaron a este partido!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAcceptInvite}
                disabled={!!actionLoading}
                className="btn-primary flex-1 !py-2.5 flex items-center justify-center gap-1"
              >
                {actionLoading === "accept" ? <Spinner size={16} className="text-white" /> : <CheckCircle2 size={16} />}
                Aceptar
              </button>
              <button
                onClick={handleRejectInvite}
                disabled={!!actionLoading}
                className="btn-danger flex-1 !py-2.5 flex items-center justify-center gap-1"
              >
                {actionLoading === "reject" ? <Spinner size={16} className="text-white" /> : <XCircle size={16} />}
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Organizer actions */}
        {isOrganizer && (
          <div className="card mb-4">
            <h3 className="section-title !mb-3">Acciones del organizador</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/matches/${id}/invite`}
                className="btn-secondary flex items-center justify-center gap-1.5 !py-2.5 text-sm"
              >
                <UserPlus size={16} /> Invitar
              </Link>
              <button
                onClick={handleBalance}
                disabled={players.length < 2 || !!actionLoading}
                className="btn-secondary flex items-center justify-center gap-1.5 !py-2.5 text-sm"
              >
                {actionLoading === "balance" ? <Spinner size={16} /> : <Brain size={16} />}
                Balancear IA
              </button>
              {match.status === "open" && (
                <button
                  onClick={() => handleUpdateStatus("confirmed")}
                  disabled={!!actionLoading}
                  className="btn-primary flex items-center justify-center gap-1.5 !py-2.5 text-sm"
                >
                  <CheckCircle2 size={16} /> Confirmar
                </button>
              )}
              {match.status === "confirmed" && (
                <button
                  onClick={() => handleUpdateStatus("in_progress")}
                  disabled={!!actionLoading}
                  className="btn-primary flex items-center justify-center gap-1.5 !py-2.5 text-sm"
                >
                  <Play size={16} /> Iniciar
                </button>
              )}
              {match.status === "in_progress" && (
                <button
                  onClick={() => handleUpdateStatus("completed")}
                  disabled={!!actionLoading}
                  className="btn-primary flex items-center justify-center gap-1.5 !py-2.5 text-sm"
                >
                  <CheckCircle2 size={16} /> Finalizar
                </button>
              )}
              {["open", "full", "confirmed"].includes(match.status) && (
                <button
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={!!actionLoading}
                  className="btn-danger flex items-center justify-center gap-1.5 !py-2.5 text-sm"
                >
                  <XCircle size={16} /> Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Teams */}
        {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
          <div className="mb-4">
            <h3 className="section-title">Equipos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="card !border-primary-200 !bg-primary-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-primary-600" />
                  <span className="font-bold text-sm text-primary-800">Equipo A</span>
                </div>
                {teamAPlayers.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 mb-2">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <div>
                      <p className="text-xs font-medium">{p.display_name}</p>
                      <p className="text-[10px] text-text-secondary">
                        {POSITIONS[p.position || ""] || ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card !border-amber-200 !bg-amber-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-amber-600" />
                  <span className="font-bold text-sm text-amber-800">Equipo B</span>
                </div>
                {teamBPlayers.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 mb-2">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <div>
                      <p className="text-xs font-medium">{p.display_name}</p>
                      <p className="text-[10px] text-text-secondary">
                        {POSITIONS[p.position || ""] || ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI explanation */}
        {match.ai_explanation && (
          <div className="card mb-4 !border-purple-200 !bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-purple-600" />
              <span className="font-bold text-sm text-purple-800">Balanceo IA</span>
            </div>
            <p className="text-sm text-purple-700">{match.ai_explanation}</p>
          </div>
        )}

        {/* Unassigned players */}
        {unassigned.length > 0 && (
          <div className="mb-4">
            <h3 className="section-title">Jugadores ({unassigned.length})</h3>
            <div className="space-y-2">
              {unassigned.map((p) => (
                <div key={p.user_id} className="card flex items-center gap-3">
                  <Avatar src={p.avatar_url} name={p.display_name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.display_name}</p>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{POSITIONS[p.position || ""] || "Sin posicion"}</span>
                      <span>&#11088; {Number(p.rating_avg || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions for completed match */}
        {match.status === "completed" && isPlayer && (
          <Link
            href={`/matches/${id}/ratings`}
            className="card-hover flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Star size={20} className="text-amber-500" />
              <span className="font-semibold text-sm">Calificar jugadores</span>
            </div>
            <span className="text-primary-600 text-sm font-medium">Ir &rarr;</span>
          </Link>
        )}

        {/* Chat link */}
        {isPlayer && (
          <Link
            href={`/chat`}
            className="card-hover flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-primary-500" />
              <span className="font-semibold text-sm">Chat del partido</span>
            </div>
            <span className="text-primary-600 text-sm font-medium">Abrir &rarr;</span>
          </Link>
        )}

        {/* Balance modal */}
        <Modal isOpen={showBalance} onClose={() => setShowBalance(false)} title="Balanceo de equipos">
          {balanceResult && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-1">Score de balance</p>
                <p className="text-3xl font-bold text-primary-600">
                  {(balanceResult.balance_score * 100).toFixed(0)}%
                </p>
              </div>
              <p className="text-sm text-gray-600">{balanceResult.explanation}</p>
              <button onClick={() => setShowBalance(false)} className="btn-primary w-full">
                Entendido
              </button>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
