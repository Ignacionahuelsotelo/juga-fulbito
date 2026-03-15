"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Swords,
  MapPin,
  Bell,
  ChevronRight,
  Plus,
  Trophy,
  Users,
  Clock,
  Star,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import api from "@/lib/api";

interface UpcomingMatch {
  id: string;
  venue_name: string | null;
  date: string;
  start_time: string;
  match_type: string;
  status: string;
  players_needed: number;
  confirmed_players_count?: number;
}

interface PendingInvitation {
  id: string;
  match_id: string;
  status: string;
  match?: {
    id: string;
    date: string;
    start_time: string;
    venue_name: string | null;
    match_type: string;
    players_needed: number;
    status: string;
  };
}

interface PendingRating {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  match_id: string;
  match_date: string;
}

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [matchesRes, invitesRes, ratingsRes] = await Promise.all([
          api.get("/matches/me?per_page=5"),
          api.get("/invitations/me"),
          api.get("/ratings/pending"),
        ]);
        const allMatches = (matchesRes.data.items || matchesRes.data || []) as UpcomingMatch[];
        // Show only non-completed/cancelled matches, sorted by date
        setUpcomingMatches(
          allMatches
            .filter((m) => !["completed", "cancelled"].includes(m.status))
            .slice(0, 3)
        );
        setInvitations(
          (invitesRes.data.items || invitesRes.data || []).filter(
            (i: PendingInvitation) => i.status === "pending"
          )
        );
        setPendingRatings(ratingsRes.data.items || ratingsRes.data || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Group pending ratings by match
  const pendingByMatch = pendingRatings.reduce<Record<string, PendingRating[]>>((acc, r) => {
    if (!acc[r.match_id]) acc[r.match_id] = [];
    acc[r.match_id].push(r);
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Header greeting */}
      <div className="gradient-header -mx-4 -mt-4 px-6 pt-6 pb-8 rounded-b-3xl mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name || "?"}
              size="lg"
            />
            <div>
              <p className="text-primary-200 text-sm">Hola!</p>
              <h1 className="text-xl font-bold text-white">
                {profile?.display_name || "Jugador"}
              </h1>
            </div>
          </div>
          <Link
            href="/notifications"
            className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          >
            <Bell size={22} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Trophy size={18} className="text-amber-300 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{profile?.matches_played || 0}</p>
            <p className="text-primary-200 text-xs">Partidos</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Star size={18} className="text-amber-300 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">
              {profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "-"}
            </p>
            <p className="text-primary-200 text-xs">Rating</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <MapPin size={18} className="text-red-300 mx-auto mb-1" />
            <p className="text-white font-bold text-sm truncate">
              {profile?.zone_name || "-"}
            </p>
            <p className="text-primary-200 text-xs">Zona</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/availability"
          className="card-hover flex items-center gap-3 !p-4"
        >
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Search size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Buscar jugadores</p>
            <p className="text-xs text-text-secondary">Cerca tuyo</p>
          </div>
        </Link>
        <Link
          href="/matches/create"
          className="card-hover flex items-center gap-3 !p-4"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Plus size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Crear partido</p>
            <p className="text-xs text-text-secondary">Arma tu fulbito</p>
          </div>
        </Link>
        <Link
          href="/availability"
          className="card-hover flex items-center gap-3 !p-4"
        >
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Disponibilidad</p>
            <p className="text-xs text-text-secondary">Marca tus horarios</p>
          </div>
        </Link>
        <Link
          href="/venues"
          className="card-hover flex items-center gap-3 !p-4"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <MapPin size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Canchas</p>
            <p className="text-xs text-text-secondary">Encontra donde jugar</p>
          </div>
        </Link>
      </div>

      {/* Pending ratings */}
      {Object.keys(pendingByMatch).length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title !mb-0">Pendientes de calificar</h2>
            <span className="badge-yellow">{pendingRatings.length}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(pendingByMatch).map(([matchId, players]) => (
              <Link
                key={matchId}
                href={`/matches/${matchId}/ratings`}
                className="card-hover flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Star size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Calificar {players.length} jugador{players.length > 1 ? "es" : ""}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Partido del {formatDate(players[0].match_date)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title !mb-0">Invitaciones pendientes</h2>
            <span className="badge-yellow">{invitations.length}</span>
          </div>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <Link
                key={inv.id}
                href={`/matches/${inv.match_id}`}
                className="card-hover flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Swords size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Te invitaron a un partido</p>
                    <p className="text-xs text-text-secondary">
                      {inv.match
                        ? `${formatDate(inv.match.date)} - ${inv.match.venue_name || "Cancha por definir"}`
                        : "Toca para ver detalles"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title !mb-0">Proximos partidos</h2>
          <Link href="/matches" className="text-sm text-primary-600 font-medium">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card">
                <div className="skeleton h-5 w-40 mb-2" />
                <div className="skeleton h-4 w-28" />
              </div>
            ))}
          </div>
        ) : upcomingMatches.length > 0 ? (
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="card-hover flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-600 uppercase">
                      {formatDate(match.date).slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold text-primary-800">
                      {formatTime(match.start_time)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {match.venue_name || "Cancha por definir"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock size={12} /> {formatDate(match.date)}
                      </span>
                      <span className={getStatusColor(match.status)}>
                        {getStatusLabel(match.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <Swords size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No tenes partidos proximos</p>
            <Link href="/matches/create" className="text-sm text-primary-600 font-medium mt-2 inline-block">
              Crear uno ahora
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
