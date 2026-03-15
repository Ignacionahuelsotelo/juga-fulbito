"use client";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  MapPin,
  Search,
  Users,
  Navigation,
  Locate,
} from "lucide-react";
import { availabilitySchema, type AvailabilityData } from "@/lib/validators";
import { Header } from "@/components/layout/header";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDate, formatTime } from "@/lib/utils";
import { MATCH_TYPE_PREFS_LIST, POSITIONS } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  zone_name: string | null;
  match_type_pref: string;
  is_active: boolean;
}

interface PlayerResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string | null;
  skill_level: string | null;
  rating_avg: number;
  distance_km: number;
  date: string;
  start_time: string;
  end_time: string;
  match_type_pref: string;
}

export default function AvailabilityPage() {
  const [tab, setTab] = useState("my");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchRadius, setSearchRadius] = useState(15);
  const [hasSearched, setHasSearched] = useState(false);
  const { position: geoPos, requestPosition, loading: geoLoading } = useGeolocation();
  const geoRequested = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AvailabilityData>({ resolver: zodResolver(availabilitySchema) });

  // Auto-request GPS on mount
  useEffect(() => {
    if (!geoRequested.current) {
      geoRequested.current = true;
      requestPosition();
    }
  }, [requestPosition]);

  useEffect(() => {
    loadSlots();
  }, []);

  // Auto-search when GPS is obtained and on search tab
  useEffect(() => {
    if (geoPos && tab === "search" && !hasSearched) {
      searchPlayers();
    }
  }, [geoPos, tab]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const res = await api.get("/availability/me");
      setSlots(res.data.items || res.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const createSlot = async (data: AvailabilityData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (geoPos) {
        payload.latitude = geoPos.latitude;
        payload.longitude = geoPos.longitude;
      }
      await api.post("/availability", payload);
      toast.success("Disponibilidad creada!");
      setShowModal(false);
      reset();
      loadSlots();
    } catch {
      toast.error("Error al crear disponibilidad");
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      await api.delete(`/availability/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const searchPlayers = async () => {
    if (!geoPos) {
      requestPosition();
      toast("Obteniendo tu ubicacion...", { icon: "📍" });
      return;
    }
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get("/availability/search", {
        params: {
          latitude: geoPos.latitude,
          longitude: geoPos.longitude,
          radius_km: searchRadius,
        },
      });
      // API returns { players: [...], total, page, per_page }
      const data = res.data;
      setPlayers(data.players || data.items || data || []);
      if ((data.players || []).length === 0) {
        toast("No se encontraron jugadores cerca. Proba aumentar el radio.", {
          icon: "🔍",
        });
      }
    } catch {
      toast.error("Error en la busqueda");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <>
      <Header title="Disponibilidad" />
      <div className="page-container">
        <Tabs
          tabs={[
            { key: "my", label: "Mis horarios", count: slots.length },
            { key: "search", label: "Buscar jugadores" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "my" && (
          <div className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size={32} />
              </div>
            ) : slots.length > 0 ? (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <div key={slot.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-50 rounded-xl flex flex-col items-center justify-center">
                        <Calendar size={14} className="text-primary-600" />
                        <span className="text-[10px] font-bold text-primary-700 mt-0.5">
                          {formatDate(slot.date).slice(0, 6)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {formatDate(slot.date)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                          <Clock size={12} />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          {slot.zone_name && (
                            <>
                              <MapPin size={12} />
                              {slot.zone_name}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSlot(slot.id)}
                      className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="Sin disponibilidad"
                description="Agrega tus horarios disponibles para que otros te encuentren"
              />
            )}

            <button
              onClick={() => setShowModal(true)}
              className="floating-btn"
            >
              <Plus size={24} />
            </button>
          </div>
        )}

        {tab === "search" && (
          <div className="mt-4">
            {/* GPS Status + Search Controls */}
            <div className="card mb-4">
              {/* GPS indicator */}
              <div className="flex items-center gap-2 mb-3">
                {geoPos ? (
                  <div className="flex items-center gap-2 text-primary-600">
                    <Locate size={16} />
                    <span className="text-xs font-medium">
                      Ubicacion detectada ({geoPos.latitude.toFixed(4)}, {geoPos.longitude.toFixed(4)})
                    </span>
                  </div>
                ) : geoLoading ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Spinner size={14} />
                    <span className="text-xs">Obteniendo ubicacion...</span>
                  </div>
                ) : (
                  <button
                    onClick={requestPosition}
                    className="flex items-center gap-2 text-sm text-primary-600 font-medium"
                  >
                    <Navigation size={16} />
                    Activar GPS
                  </button>
                )}
              </div>

              {/* Radius selector */}
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs text-text-secondary whitespace-nowrap">Radio:</label>
                <div className="flex gap-1.5 flex-1">
                  {[5, 10, 15, 25, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSearchRadius(r)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        searchRadius === r
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={searchPlayers}
                disabled={searchLoading || geoLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {searchLoading || geoLoading ? (
                  <Spinner size={18} className="text-white" />
                ) : (
                  <Search size={18} />
                )}
                {geoLoading
                  ? "Obteniendo ubicacion..."
                  : searchLoading
                  ? "Buscando..."
                  : "Buscar jugadores cercanos"}
              </button>
            </div>

            {players.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  {players.length} jugador{players.length !== 1 ? "es" : ""} encontrado{players.length !== 1 ? "s" : ""}
                </p>
                {players.map((player, idx) => (
                  <Link
                    key={idx}
                    href={`/players/${player.user_id}`}
                    className="card flex items-center gap-3 hover:shadow-md transition-shadow"
                  >
                    <Avatar src={player.avatar_url} name={player.display_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{player.display_name}</p>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                        <span>{POSITIONS[player.position || ""] || player.position || "Sin posicion"}</span>
                        <span>&#183;</span>
                        <span>&#11088; {Number(player.rating_avg).toFixed(1)}</span>
                        <span>&#183;</span>
                        <span className="text-primary-600 font-medium">{player.distance_km.toFixed(1)} km</span>
                      </div>
                      <p className="text-xs text-primary-600 mt-0.5">
                        {formatDate(player.date)} {formatTime(player.start_time)}-{formatTime(player.end_time)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              !searchLoading && (
                <EmptyState
                  icon={Users}
                  title={hasSearched ? "Sin resultados" : "Busca jugadores"}
                  description={
                    hasSearched
                      ? "No hay jugadores disponibles en esa zona. Proba aumentar el radio de busqueda."
                      : "Usa tu ubicacion para encontrar jugadores disponibles cerca"
                  }
                />
              )
            )}
          </div>
        )}

        {/* Create modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva disponibilidad">
          <form onSubmit={handleSubmit(createSlot)} className="space-y-4">
            {/* GPS for new slot */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 text-primary-700">
              {geoPos ? (
                <>
                  <Locate size={16} />
                  <span className="text-xs font-medium">Ubicacion GPS incluida automaticamente</span>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span className="text-xs">GPS no disponible - activa la ubicacion</span>
                  <button type="button" onClick={requestPosition} className="ml-auto text-xs font-bold underline">
                    Activar
                  </button>
                </>
              )}
            </div>

            <div>
              <label className="label">Fecha</label>
              <input {...register("date")} type="date" className={`input-field ${errors.date ? "input-error" : ""}`} />
              {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Desde</label>
                <input {...register("start_time")} type="time" className={`input-field ${errors.start_time ? "input-error" : ""}`} />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input {...register("end_time")} type="time" className={`input-field ${errors.end_time ? "input-error" : ""}`} />
              </div>
            </div>

            <div>
              <label className="label">Zona (opcional)</label>
              <input {...register("zone_name")} className="input-field" placeholder="Ej: Palermo" />
            </div>

            <div>
              <label className="label">Tipo de partido</label>
              <select {...register("match_type_pref")} className="input-field">
                {MATCH_TYPE_PREFS_LIST.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving ? <Spinner size={18} className="text-white" /> : <Plus size={18} />}
              {saving ? "Creando..." : "Crear disponibilidad"}
            </button>
          </form>
        </Modal>
      </div>
    </>
  );
}
