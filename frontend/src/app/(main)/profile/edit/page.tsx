"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Save, Locate, Navigation } from "lucide-react";
import { profileSchema, type ProfileData } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Header } from "@/components/layout/header";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { MapEmbed } from "@/components/ui/map-embed";
import {
  POSITIONS_LIST,
  SKILL_LEVELS_LIST,
  PLAY_STYLES_LIST,
  DOMINANT_FEET_LIST,
} from "@/lib/constants";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ProfileEditPage() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const { position: geoPos, requestPosition, loading: geoLoading } = useGeolocation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const geoRequested = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || "",
      age: profile?.age,
      position: profile?.position || "",
      skill_level: profile?.skill_level || "",
      play_style: profile?.play_style || "",
      dominant_foot: profile?.dominant_foot || "",
      bio: profile?.bio || "",
      zone_name: profile?.zone_name || "",
    },
  });

  // Reverse geocode coordinates to get a clean zone name (e.g. "Palermo, CABA")
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=14`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      if (data.address) {
        const suburb = data.address.suburb || data.address.neighbourhood || data.address.city_district || "";
        const city = data.address.city || data.address.town || data.address.village || "";
        const state = data.address.state || "";
        const parts = [suburb, city || state].filter(Boolean);
        const zone = parts.join(", ") || data.display_name?.split(",").slice(0, 2).join(",").trim() || "";
        if (zone) setValue("zone_name", zone);
      }
    } catch {
      // silent
    }
  };

  // Auto-request GPS
  useEffect(() => {
    if (!geoRequested.current) {
      geoRequested.current = true;
      requestPosition();
    }
  }, [requestPosition]);

  // Auto-detect zone when GPS is obtained and no manual selection yet
  useEffect(() => {
    if (geoPos && !selectedLat) {
      reverseGeocode(geoPos.latitude, geoPos.longitude);
    }
  }, [geoPos]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    reverseGeocode(lat, lng);
    toast.success("Ubicacion actualizada!");
  };

  const onSubmit = async (data: ProfileData) => {
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
      const res = await api.put("/users/me", payload);
      setProfile(res.data);
      toast.success("Perfil actualizado!");
      router.back();
    } catch {
      toast.error("Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile({ ...profile!, avatar_url: res.data.avatar_url });
      toast.success("Foto actualizada!");
    } catch {
      toast.error("Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header title="Editar perfil" showBack />
      <div className="page-container">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name || "?"}
              size="xl"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors"
            >
              {uploading ? <Spinner size={14} className="text-white" /> : <Camera size={14} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input {...register("display_name")} className={`input-field ${errors.display_name ? "input-error" : ""}`} />
            {errors.display_name && <p className="text-danger text-xs mt-1">{errors.display_name.message}</p>}
          </div>

          <div>
            <label className="label">Edad</label>
            <input {...register("age", { valueAsNumber: true })} type="number" className="input-field" placeholder="Ej: 25" />
          </div>

          {/* Location with map */}
          <div>
            <label className="label">Tu ubicacion</label>
            <p className="text-xs text-text-secondary mb-2">
              Busca tu zona en el mapa o usa el GPS para detectarla
            </p>
            <MapEmbed
              latitude={selectedLat || geoPos?.latitude}
              longitude={selectedLng || geoPos?.longitude}
              onLocationSelect={handleLocationSelect}
              interactive
              height="200px"
              showMarker={!!(selectedLat || geoPos)}
              label={selectedLat ? "Ubicacion seleccionada" : geoPos ? "Tu ubicacion GPS" : undefined}
            />
            <div className="flex items-center gap-2 mt-2 text-xs">
              {geoPos || selectedLat ? (
                <span className="flex items-center gap-1 text-primary-600">
                  <Locate size={12} /> {selectedLat ? "Ubicacion seleccionada en mapa" : "GPS detectado"}
                </span>
              ) : geoLoading ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <Spinner size={10} /> Detectando GPS...
                </span>
              ) : (
                <button type="button" onClick={requestPosition} className="flex items-center gap-1 text-primary-600 font-medium">
                  <Navigation size={12} /> Activar GPS
                </button>
              )}
            </div>
          </div>

          {/* Zona - auto-detected from GPS/map selection */}
          <div>
            <label className="label">Zona</label>
            <input
              {...register("zone_name")}
              readOnly
              className="input-field bg-gray-50 cursor-not-allowed"
              placeholder="Se detecta automaticamente desde el mapa"
            />
            <p className="text-[10px] text-text-secondary mt-1">
              Se detecta automaticamente segun la ubicacion seleccionada
            </p>
          </div>

          <div>
            <label className="label">Posicion</label>
            <select {...register("position")} className="input-field">
              <option value="">Seleccionar...</option>
              {POSITIONS_LIST.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nivel</label>
            <select {...register("skill_level")} className="input-field">
              <option value="">Seleccionar...</option>
              {SKILL_LEVELS_LIST.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Estilo de juego</label>
            <select {...register("play_style")} className="input-field">
              <option value="">Seleccionar...</option>
              {PLAY_STYLES_LIST.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Pie habil</label>
            <select {...register("dominant_foot")} className="input-field">
              <option value="">Seleccionar...</option>
              {DOMINANT_FEET_LIST.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              {...register("bio")}
              rows={3}
              className="input-field resize-none"
              placeholder="Conta algo sobre vos..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size={20} className="text-white" /> : <Save size={20} />}
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </>
  );
}
