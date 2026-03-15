"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Swords,
  Plus,
  Clock,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, formatTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import { MATCH_TYPES } from "@/lib/constants";
import api from "@/lib/api";

interface Match {
  id: string;
  venue_name: string | null;
  date: string;
  start_time: string;
  match_type: string;
  players_needed: number;
  status: string;
}

export default function MatchesPage() {
  const [tab, setTab] = useState("all");
  const [matches, setMatches] = useState<Match[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const [allRes, myRes] = await Promise.all([
        api.get("/matches?limit=20"),
        api.get("/matches/me?limit=20"),
      ]);
      setMatches(allRes.data.items || allRes.data || []);
      setMyMatches(myRes.data.items || myRes.data || []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const displayMatches = tab === "all" ? matches : myMatches;

  return (
    <>
      <Header title="Partidos" />
      <div className="page-container">
        <Tabs
          tabs={[
            { key: "all", label: "Todos", count: matches.length },
            { key: "mine", label: "Mis partidos", count: myMatches.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size={32} />
            </div>
          ) : displayMatches.length > 0 ? (
            <div className="space-y-3">
              {displayMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="card-hover flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-primary-50 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-500 uppercase">
                        {formatDate(match.date).slice(0, 3)}
                      </span>
                      <span className="text-base font-bold text-primary-800">
                        {formatTime(match.start_time)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {match.venue_name || "Cancha por definir"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock size={11} /> {formatDate(match.date)}
                        </span>
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Users size={11} /> {MATCH_TYPES[match.match_type] || match.match_type}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className={getStatusColor(match.status)}>
                          {getStatusLabel(match.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Swords}
              title={tab === "all" ? "No hay partidos" : "Sin partidos"}
              description={
                tab === "all"
                  ? "No hay partidos disponibles. Crea uno!"
                  : "Todavia no te uniste a ningun partido"
              }
              action={
                <Link href="/matches/create" className="btn-primary inline-flex items-center gap-2">
                  <Plus size={18} /> Crear partido
                </Link>
              }
            />
          )}
        </div>

        <Link href="/matches/create" className="floating-btn">
          <Plus size={24} />
        </Link>
      </div>
    </>
  );
}
