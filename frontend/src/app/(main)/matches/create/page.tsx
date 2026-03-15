"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Swords, Locate, Navigation } from "lucide-react";
import { matchSchema, type MatchData } from "@/lib/validators";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/spinner";
import { MapEmbed } from "@/components/ui/map-embed";
import { useGeolocation } from "@/hooks/use-geolocation";
import { MATCH_TYPES_LIST, SKILL_LEVELS_LIST, DURATION_OPTIONS } from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const { position: geoPos, requestPosition, loading: geoLoading } = useGeolocation();
  const geoRequested = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MatchData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      duration_minutes: 60,
      players_needed: 10,
      match_type: "5v5",
    },
  });

  // Auto-request GPS on mount
  useEffect(() => {
    if (!geoRequested.current) {
      geoRequested.current = true;
      requestPosition();
    }
  }, [requestPosition]);

  const handleLocationSelect = (lat: number, lng: number, address?: string, name?: string) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    if (name) setValue("venue_name", name);
    if (address) setValue("venue_address", address);
    toast.success("Ubicacion seleccionada!");
  };

  const onSubmit = async (data: MatchData) => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (selectedLat && selectedLng) {
        payload.latitude = selectedLat;
        payload.longitude = selectedLng;
      } else if (geoPos) {
        payload.latitude = geoPos.latitude;
        payload.longitude = geoPos.longitude;
      }
      const res = await api.post("/matches", payload);
      toast.success("Partido creado!");
      router.push(`/matches/${res.data.id}`);
    } catch {
      toast.error("Error al crear partido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Crear partido" showBack />
      <div className="page-container">
        {/* Hero */}
        <div className="gradient-header -mx-4 -mt-4 px-6 pt-6 pb-8 rounded-b-3xl mb-6 text-center">
          <Swords size={40} className="text-white/80 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-white">Arma tu fulbito</h2>
          <p className="text-primary-200 text-sm mt-1">Completa los datos del partido</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                {...register("date")}
                type="date"
                className={`input-field ${errors.date ? "input-error" : ""}`}
              />
              {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="label">Hora</label>
              <input
                {...register("start_time")}
                type="time"
                className={`input-field ${errors.start_time ? "input-error" : ""}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duracion</label>
              <select {...register("duration_minutes", { valueAsNumber: true })} className="input-field">
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jugadores</label>
              <input
                {...register("players_needed", { valueAsNumber: true })}
                type="number"
                min={2}
                max={22}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Tipo de partido</label>
            <div className="grid grid-cols-3 gap-2">
              {MATCH_TYPES_LIST.map((type) => (
                <label
                  key={type.value}
                  className="card-hover text-center cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
                >
                  <input
                    {...register("match_type")}
                    type="radio"
                    value={type.value}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nivel deseado (opcional)</label>
            <select {...register("desired_level")} className="input-field">
              <option value="">Cualquier nivel</option>
              {SKILL_LEVELS_LIST.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="divider" />

          {/* Map - search for venue */}
          <div>
            <label className="label">Busca la cancha en el mapa</label>
            <p className="text-xs text-text-secondary mb-2">
              Busca una cancha o direccion y se completan los campos automaticamente
            </p>
            <MapEmbed
              latitude={selectedLat || geoPos?.latitude}
              longitude={selectedLng || geoPos?.longitude}
              onLocationSelect={handleLocationSelect}
              interactive
              height="220px"
              showMarker={!!(selectedLat && selectedLng)}
              label={selectedLat ? watch("venue_name") || "Ubicacion seleccionada" : undefined}
            />
          </div>

          {/* GPS indicator */}
          <div className="flex items-center gap-2 text-xs">
            {geoPos || (selectedLat && selectedLng) ? (
              <span className="flex items-center gap-1 text-primary-600">
                <Locate size={12} /> Ubicacion {selectedLat ? "seleccionada en mapa" : "GPS detectada"}
              </span>
            ) : geoLoading ? (
              <span className="flex items-center gap-1 text-amber-600">
                <Spinner size={10} /> Obteniendo ubicacion...
              </span>
            ) : (
              <button type="button" onClick={requestPosition} className="flex items-center gap-1 text-primary-600 font-medium">
                <Navigation size={12} /> Activar GPS
              </button>
            )}
          </div>

          <div>
            <label className="label">Nombre de la cancha</label>
            <input
              {...register("venue_name")}
              className="input-field"
              placeholder="Ej: La Canchita de Palermo"
            />
          </div>

          <div>
            <label className="label">Direccion</label>
            <input
              {...register("venue_address")}
              className="input-field"
              placeholder="Ej: Av. del Libertador 5200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 !mt-6"
          >
            {loading ? <Spinner size={20} className="text-white" /> : <Swords size={20} />}
            {loading ? "Creando..." : "Crear partido"}
          </button>
        </form>
      </div>
    </>
  );
}
