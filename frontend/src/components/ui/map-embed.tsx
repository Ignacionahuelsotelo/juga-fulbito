"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Locate, Navigation, Search, X } from "lucide-react";
import { Spinner } from "./spinner";

interface MapEmbedProps {
  /** Current latitude */
  latitude?: number | null;
  /** Current longitude */
  longitude?: number | null;
  /** Called when user picks a location on the map */
  onLocationSelect?: (lat: number, lng: number, address?: string, name?: string) => void;
  /** Whether the map is interactive (can pick locations) */
  interactive?: boolean;
  /** Height of the map */
  height?: string;
  /** Search query for nearby places */
  searchQuery?: string;
  /** Show a static map with a marker at lat/lng */
  showMarker?: boolean;
  /** Map zoom level */
  zoom?: number;
  /** Label to show */
  label?: string;
}

/**
 * OpenStreetMap embed component.
 * For interactive location picking, uses Nominatim for reverse geocoding.
 * No API key needed!
 */
export function MapEmbed({
  latitude,
  longitude,
  onLocationSelect,
  interactive = false,
  height = "250px",
  searchQuery,
  showMarker = true,
  zoom = 14,
  label,
}: MapEmbedProps) {
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
    name?: string;
  }>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const lat = latitude ?? -34.6037;
  const lng = longitude ?? -58.3816;

  // Build OSM embed URL
  const getMapUrl = () => {
    if (showMarker && latitude && longitude) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.01},${lng + 0.015},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
    }
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03},${lat - 0.02},${lng + 0.03},${lat + 0.02}&layer=mapnik`;
  };

  // Nominatim search (free, no API key)
  const searchNominatim = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "6",
        countrycodes: "ar",
        addressdetails: "1",
      });
      // Add viewbox if we have a position to bias results
      if (latitude && longitude) {
        params.set("viewbox", `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`);
        params.set("bounded", "0");
      }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [latitude, longitude, lat, lng]);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchText(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchNominatim(value);
    }, 400);
  };

  const selectResult = (result: { display_name: string; lat: string; lon: string; name?: string }) => {
    const parts = result.display_name.split(", ");
    const name = result.name || parts[0];
    const address = parts.slice(0, 3).join(", ");
    onLocationSelect?.(parseFloat(result.lat), parseFloat(result.lon), address, name);
    setShowSearch(false);
    setSearchText("");
    setSearchResults([]);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200">
      {/* Search bar for interactive mode */}
      {interactive && (
        <div className="absolute top-2 left-2 right-2 z-10">
          {showSearch ? (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="flex items-center gap-2 p-2 border-b">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Buscar cancha, direccion..."
                  className="flex-1 text-sm outline-none bg-transparent"
                  autoFocus
                />
                {searching && <Spinner size={14} />}
                <button onClick={() => { setShowSearch(false); setSearchResults([]); }}>
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectResult(r)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 border-b border-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-800 truncate">{r.name || r.display_name.split(",")[0]}</p>
                      <p className="text-gray-500 truncate">{r.display_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-sm text-gray-500 hover:bg-white transition-colors"
            >
              <Search size={16} />
              Buscar cancha o direccion...
            </button>
          )}
        </div>
      )}

      {/* Map iframe */}
      <iframe
        src={getMapUrl()}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        title="Mapa"
      />

      {/* Label overlay */}
      {label && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <MapPin size={12} className="text-primary-600" />
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Google Maps link button - opens the venue location in Google Maps
 */
export function GoogleMapsButton({
  address,
  name,
  latitude,
  longitude,
  className = "",
}: {
  address?: string | null;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}) {
  const openMaps = () => {
    let url: string;
    if (latitude && longitude) {
      const query = name ? encodeURIComponent(name) : `${latitude},${longitude}`;
      url = `https://www.google.com/maps/search/${query}/@${latitude},${longitude},16z`;
    } else if (address) {
      url = `https://www.google.com/maps/search/${encodeURIComponent(`${name || ""} ${address}`)}`;
    } else {
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={openMaps}
      className={`flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors ${className}`}
    >
      <Navigation size={14} />
      Ver en Google Maps
    </button>
  );
}
