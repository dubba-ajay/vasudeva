import React, { useEffect, useRef, useState } from "react";

type LatLng = { latitude: number; longitude: number };

type Salon = {
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Props = {
  salon: Salon;
  userLocation?: LatLng | null;
  height?: number | string;
  showRoute?: boolean; // if true and both coords exist, draw route
};

// Utility to load external script or css
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src=\"${src}\"]`);
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(s);
  });
}
function loadCSS(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href=\"${href}\"]`);
    if (existing) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = () => resolve();
    l.onerror = () => reject(new Error(`Failed to load css ${href}`));
    document.head.appendChild(l);
  });
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.error("Geocode error", err);
    return null;
  }
}

async function fetchRoute(origin: { lat: number; lon: number }, dest: { lat: number; lon: number }) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
      return data.routes[0].geometry; // geojson
    }
    return null;
  } catch (err) {
    console.error("Route fetch error", err);
    return null;
  }
}

export default function LeafletMap({ salon, userLocation, height = 240, showRoute = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [salonCoords, setSalonCoords] = useState<{ lat: number; lon: number } | null>(
    salon.latitude && salon.longitude ? { lat: salon.latitude, lon: salon.longitude } : null
  );

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await loadCSS("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
      } catch (err) {
        console.error(err);
        setError("Failed to load map library");
        return;
      }

      // @ts-ignore
      const L = (window as any).L;
      if (!L) {
        setError("Map library not available");
        return;
      }

      if (!containerRef.current) return;

      // geocode salon if needed
      if (!salonCoords && salon.address) {
        const g = await geocodeAddress(`${salon.address} ${salon.name || ""}`);
        if (!cancelled) {
          if (g) setSalonCoords({ lat: g.lat, lon: g.lon });
          else setError("Unable to locate salon address");
        }
      }

      // Wait until we have at least one coordinate (user or salon)
      const initializeWhenReady = () => {
        const hasSalon = !!salonCoords;
        const hasUser = !!userLocation;
        if (!hasSalon && !hasUser) return false;

        if (mapRef.current) {
          // update markers
          mapRef.current.eachLayer((layer: any) => {
            if (layer && layer.options && layer.options.pane !== "tilePane") {
              try { mapRef.current.removeLayer(layer); } catch {}
            }
          });
        } else {
          // create map
          mapRef.current = L.map(containerRef.current, { zoomControl: false, attributionControl: false });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(mapRef.current);
        }

        const markers: any[] = [];
        if (hasSalon && salonCoords) {
          const m = L.marker([salonCoords.lat, salonCoords.lon]).addTo(mapRef.current);
          m.bindPopup(`<strong>${(salon.name || "Salon").replace(/"/g, "\"")}</strong><br/>${(salon.address || "").replace(/"/g, "\"")}`);
          markers.push([salonCoords.lat, salonCoords.lon]);
        }
        if (hasUser && userLocation) {
          const m = L.marker([userLocation.latitude, userLocation.longitude], { opacity: 0.9 }).addTo(mapRef.current);
          m.bindPopup(`<strong>Your Location</strong>`);
          markers.push([userLocation.latitude, userLocation.longitude]);
        }

        // If showRoute and both coords exist, fetch route and draw
        if (showRoute && salonCoords && userLocation) {
          fetchRoute({ lat: userLocation.latitude, lon: userLocation.longitude }, { lat: salonCoords.lat, lon: salonCoords.lon }).then((geom) => {
            if (!geom || !geom.coordinates) return;
            const coords = geom.coordinates.map((c: any) => [c[1], c[0]]);
            const poly = L.polyline(coords, { color: "#2563eb", weight: 4 }).addTo(mapRef.current);
            // extend bounds to include polyline
            const bounds = poly.getBounds();
            mapRef.current.fitBounds(bounds.pad(0.25));
          }).catch(() => {
            // fallback to fit bounds of markers
            if (markers.length > 0) mapRef.current.fitBounds(markers as any, { padding: [50, 50] });
          });
        } else {
          if (markers.length === 1) {
            mapRef.current.setView(markers[0], 15);
          } else if (markers.length > 1) {
            mapRef.current.fitBounds(markers as any, { padding: [50, 50] });
          }
        }

        return true;
      };

      // If salonCoords wasn't set before, wait until it is
      const waiter = async () => {
        // try to initialize repeatedly for a short period
        for (let i = 0; i < 20; i++) {
          if (initializeWhenReady()) return;
          await new Promise((r) => setTimeout(r, 200));
        }
        // last attempt
        initializeWhenReady();
      };

      waiter();
    }

    setup();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {}
    };
  }, [salon.address, salon.name, salonCoords, userLocation, showRoute]);

  // when salon prop changes with explicit coords, update state
  useEffect(() => {
    if (salon.latitude && salon.longitude) {
      setSalonCoords({ lat: salon.latitude, lon: salon.longitude });
    }
  }, [salon.latitude, salon.longitude]);

  return (
    <div>
      {error ? (
        <div className="h-48 w-full rounded bg-gray-100 flex items-center justify-center text-sm text-muted-foreground">{error}</div>
      ) : (
        <div ref={containerRef} style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }} />
      )}
    </div>
  );
}
