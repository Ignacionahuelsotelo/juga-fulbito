"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { MapPin, Save } from "lucide-react";
import { venueSchema, type VenueData } from "@/lib/validators";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/spinner";
import { useGeolocation } from "@/hooks/use-geolocation";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CreateVenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { position: geoPos, requestPosition, loading: geoLoading } = useGeolocation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VenueData>({
    resolver: zodResolver(venueSchema),
    defaultValues: { latitude: 0, longitude: 0 },
  });

  const handleGeolocate = () => {
    requestPosition();
    if (geoPos) {
      setValue("latitude", geoPos.latitude);
      setValue("longitude", geoPos.longitude);
    }
  };

  // Update coords when geoPos changes
  if (geoPos) {
    setValue("latitude", geoPos.latitude);
    setValue("longitude", geoPos.longitude);
  }

  const onSubmit = async (data: VenueData) => {
    setLoading(true);
    try {
      await api.post("/venues", data);
      toast.success("Cancha registrada!");
      router.push("/venues");
    } catch {
      toast.error("Error al registrar cancha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Nueva cancha" showBack />
      <div className="page-container">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nombre de la cancha</label>
            <input
              {...register("name")}
              className={`input-field ${errors.name ? "input-error" : ""}`}
              placeholder="Ej: La Canchita FC"
            />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Direccion</label>
            <input
              {...register("address")}
              className={`input-field ${errors.address ? "input-error" : ""}`}
              placeholder="Ej: Av. Corrientes 1234, CABA"
            />
            {errors.address && <p className="text-danger text-xs mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <label className="label">Telefono (opcional)</label>
            <input
              {...register("phone")}
              className="input-field"
              placeholder="Ej: 11-2345-6789"
            />
          </div>

          <div>
            <label className="label">Ubicacion</label>
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {geoLoading ? <Spinner size={16} /> : <MapPin size={16} />}
              {geoPos ? "Ubicacion detectada" : "Usar mi ubicacion"}
            </button>
            {geoPos && (
              <p className="text-xs text-primary-600 mt-1">
                Lat: {geoPos.latitude.toFixed(4)}, Lon: {geoPos.longitude.toFixed(4)}
              </p>
            )}
            {(errors.latitude || errors.longitude) && (
              <p className="text-danger text-xs mt-1">Debes seleccionar una ubicacion</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 !mt-6"
          >
            {loading ? <Spinner size={18} className="text-white" /> : <Save size={18} />}
            {loading ? "Guardando..." : "Registrar cancha"}
          </button>
        </form>
      </div>
    </>
  );
}
