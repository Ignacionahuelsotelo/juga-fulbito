"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  MapPin,
  Star,
  Trophy,
  Target,
  Zap,
  Footprints,
  LogOut,
  ChevronRight,
  Settings,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Header } from "@/components/layout/header";
import { getRatingLabel } from "@/lib/utils";
import { POSITIONS, SKILL_LEVELS, PLAY_STYLES, DOMINANT_FEET } from "@/lib/constants";
import api from "@/lib/api";

interface MatchSummary {
  id: string;
  date: string;
  venue_name: string | null;
  status: string;
}

export default function ProfilePage() {
  const { profile, user, logout } = useAuthStore();
  const [recentMatches, setRecentMatches] = useState<MatchSummary[]>([]);

  useEffect(() => {
    if (user?.id) {
      api
        .get(`/users/${user.id}/matches?limit=5`)
        .then((res) => setRecentMatches(res.data.items || res.data || []))
        .catch(() => {});
    }
  }, [user?.id]);

  const infoItems = [
    { icon: Target, label: "Posicion", value: POSITIONS[profile?.position || ""] },
    { icon: Zap, label: "Nivel", value: SKILL_LEVELS[profile?.skill_level || ""] },
    { icon: Footprints, label: "Estilo", value: PLAY_STYLES[profile?.play_style || ""] },
    { icon: Footprints, label: "Pie habil", value: DOMINANT_FEET[profile?.dominant_foot || ""] },
  ];

  return (
    <>
      <Header
        title="Mi perfil"
        rightAction={
          <Link href="/profile/edit" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Edit3 size={20} className="text-primary-600" />
          </Link>
        }
      />
      <div className="page-container">
        {/* Profile header */}
        <div className="text-center mb-6">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || "?"}
            size="xl"
            className="mx-auto mb-3"
          />
          <h2 className="text-xl font-bold text-gray-800">{profile?.display_name}</h2>
          {profile?.zone_name && (
            <p className="text-sm text-text-secondary flex items-center justify-center gap-1 mt-1">
              <MapPin size={14} /> {profile.zone_name}
            </p>
          )}
          {profile?.bio && (
            <p className="text-sm text-gray-600 mt-2 max-w-xs mx-auto">{profile.bio}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <Trophy size={20} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{profile?.matches_played || 0}</p>
            <p className="text-xs text-text-secondary">Partidos</p>
          </div>
          <div className="card text-center">
            <Star size={20} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold">
              {profile?.rating_avg ? Number(profile.rating_avg).toFixed(1) : "-"}
            </p>
            <p className="text-xs text-text-secondary">
              {profile?.rating_avg ? getRatingLabel(Number(profile.rating_avg)) : "Sin rating"}
            </p>
          </div>
          <div className="card text-center">
            <Zap size={20} className="text-primary-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{profile?.skill_level ? SKILL_LEVELS[profile.skill_level] : "-"}</p>
            <p className="text-xs text-text-secondary">Nivel</p>
          </div>
        </div>

        {/* Player info */}
        <div className="card mb-6">
          <h3 className="section-title !mb-4">Info de jugador</h3>
          <div className="space-y-3">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-primary-500" />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{value || "Sin definir"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {profile?.tags && Object.keys(profile.tags).length > 0 && (
          <div className="card mb-6">
            <h3 className="section-title !mb-3">Tags de la comunidad</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.tags)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 8)
                .map(([tag, count]) => (
                  <span key={tag} className="badge-green">
                    {tag} ({count as number})
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="card mb-6 !p-0 divide-y divide-gray-50">
          <Link href="/notifications" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-gray-500" />
              <span className="text-sm font-medium">Notificaciones</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
          <Link href="/venues" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-gray-500" />
              <span className="text-sm font-medium">Canchas</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
          <Link href="/profile/edit" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-gray-500" />
              <span className="text-sm font-medium">Editar perfil</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-danger"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Cerrar sesion</span>
          </button>
        </div>
      </div>
    </>
  );
}
