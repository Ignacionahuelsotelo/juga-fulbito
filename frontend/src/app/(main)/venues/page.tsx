"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MapPin, Plus, Phone, Search, ExternalLink, Navigation, Locate } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useGeolocation } from "@/hooks/use-geolocation";
import api from "@/lib/api";

interface Venue {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  distance_km?: number;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const { position: geoPos, requestPosition, loading: geoLoading } = useGeolocation();
  const geoRequested = useRef(false);

  // Auto-request GPS
  useEffect(() => {
    if (!geoRequested.current) {
      geoRequested.current = true;
      requestPosition();
    }
  }, [requestPosition]);

  useEffect(() => {
    loadVenues();
  }, [geoPos]);

  const loadVenues = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (geoPos) {
        params.latitude = geoPos.latitude;
        params.longitude = geoPos.longitude;
        params.radius_km = 20;
      }
      const res = await api.get("/venues", { params });
      setVenues(res.data.items || res.data || []);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMapsSearch = () => {
    let url: string;
    if (geoPos) {
      url = `https://www.google.com/maps/search/canchas+de+futbol+5/@${geoPos.latitude},${geoPos.longitude},14z`;
    } else {
      url = `https://www.google.com/maps/search/canchas+de+futbol+5`;
    }
    window.open(url, "_blank");
  };

  const openVenueInMaps = (venue: Venue) => {
    const query = encodeURIComponent(`${venue.name} ${venue.address}`);
    window.open(`https://www.google.com/maps/search/${query}`, "_blank");
  };

  return (
    <>
      <Header title="Canchas" showBack />
      <div className="page-container">
        {/* GPS status */}
        <div className="flex items-center gap-2 mb-3">
          {geoPos ? (
            <div className="flex items-center gap-2 text-primary-600">
              <Locate size={14} />
              <span className="text-xs font-medium">Ubicacion detectada</span>
            </div>
          ) : geoLoading ? (
            <div className="flex items-center gap-2 text-amber-600">
              <Spinner size={12} />
              <span className="text-xs">Obteniendo ubicacion...</span>
            </div>
          ) : (
            <button onClick={requestPosition} className="flex items-center gap-2 text-primary-600 text-xs font-medium">
              <Navigation size={14} /> Activar GPS
            </button>
          )}
        </div>

        {/* Google Maps search */}
        <button
          onClick={openGoogleMapsSearch}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-primary-300 text-primary-700 hover:bg-primary-50 transition-colors text-sm font-medium mb-4"
        >
          <Search size={16} />
          Buscar canchas en Google Maps
          <ExternalLink size={14} />
        </button>

        {loading || geoLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : venues.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              {venues.length} cancha{venues.length !== 1 ? "s" : ""} registrada{venues.length !== 1 ? "s" : ""}
            </p>
            {venues.map((venue) => (
              <div key={venue.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-800 mb-1">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                      <MapPin size={12} /> {venue.address}
                    </div>
                    {venue.phone && (
                      <a
                        href={`tel:${venue.phone}`}
                        className="flex items-center gap-1 text-xs text-primary-600 mb-1"
                      >
                        <Phone size={12} /> {venue.phone}
                      </a>
                    )}
                    {venue.distance_km != null && (
                      <span className="badge-green mt-1">
                        {venue.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openVenueInMaps(venue)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Ver en Google Maps"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="Sin canchas"
            description="No hay canchas registradas cerca. Busca en Google Maps o agrega una!"
            action={
              <div className="flex gap-2">
                <button onClick={openGoogleMapsSearch} className="btn-secondary inline-flex items-center gap-2">
                  <Search size={16} /> Google Maps
                </button>
                <Link href="/venues/create" className="btn-primary inline-flex items-center gap-2">
                  <Plus size={16} /> Agregar
                </Link>
              </div>
            }
          />
        )}

        <Link href="/venues/create" className="floating-btn">
          <Plus size={24} />
        </Link>
      </div>
    </>
  );
}
