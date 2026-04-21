import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, Spinner } from "@deliphone/ui";
import { Navigation, QrCode, Smartphone, User, ChevronRight } from "lucide-react";
import { locationsApi, type LocationBrief } from "@/api/locations";
import { rentalsApi, type RentalBrief } from "@/api/rentals";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@deliphone/ui/tokens";

function svgIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
}
const greenIcon = svgIcon("#1E8E4F");
const yellowIcon = svgIcon("#B8730A");
const greyIcon = svgIcon("#9C9C95");
function getIcon(loc: LocationBrief) {
  if (loc.status !== "active") return greyIcon;
  return loc.available_devices > 0 ? greenIcon : yellowIcon;
}

function FlyToUser() {
  const map = useMap();
  useState(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 14),
      () => {}, { enableHighAccuracy: false, timeout: 5000 },
    );
  });
  return null;
}

export function MapPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<LocationBrief | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list(),
    staleTime: 60_000,
  });

  const { data: activeRentals } = useQuery({
    queryKey: ["rentals-active"],
    queryFn: () => rentalsApi.list("active"),
    staleTime: 30_000,
  });

  const rentals = activeRentals?.items ?? [];

  return (
    <div className="relative h-screen overflow-hidden">
      {/* ── Map ── */}
      <MapContainer
        center={[55.7558, 37.6173]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToUser />
        {locations
          .filter((l) => l.lat != null && l.lng != null)
          .map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={getIcon(loc)}
              eventHandlers={{ click: () => setSelected(loc) }}
            />
          ))}
      </MapContainer>

      {/* ── Top left: profile pill ── */}
      <button
        onClick={() => navigate("/profile")}
        className="absolute top-12 left-12 z-[1000] flex items-center gap-8"
        style={{
          height: 44,
          padding: "0 14px 0 6px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 2px 12px rgba(15,15,14,0.1)",
          border: "1px solid rgba(15,15,14,0.06)",
          cursor: "pointer",
        }}
      >
        {user?.telegram_photo_url ? (
          <img src={user.telegram_photo_url} alt="" className="rounded-full" style={{ width: 32, height: 32 }} />
        ) : (
          <div className="rounded-full bg-ink-900 text-accent flex items-center justify-center font-bold" style={{ width: 32, height: 32, fontSize: 13 }}>
            {user?.telegram_first_name?.[0] ?? "?"}
          </div>
        )}
        <span className="body-sm font-medium text-ink-900">0 ₽</span>
      </button>

      {/* ── Active rentals (floating cards) ── */}
      {rentals.length > 0 && !selected && (
        <div className="absolute top-12 right-12 z-[1000] flex flex-col gap-8" style={{ maxWidth: 220 }}>
          {rentals.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/rental/${r.id}`)}
              className="flex items-center gap-8 text-left"
              style={{
                padding: "10px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 2px 12px rgba(15,15,14,0.1)",
                border: "1px solid rgba(15,15,14,0.06)",
                cursor: "pointer",
              }}
            >
              <div className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: colors.accent.DEFAULT }}>
                <Smartphone size={16} color={colors.accent.ink} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="caption font-semibold m-0 truncate">{r.device.model}</p>
                <p className="caption text-ink-500 m-0">
                  {r.status === "active" ? `до ${new Date(r.paid_until!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : r.status}
                </p>
              </div>
              <ChevronRight size={14} className="text-ink-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom: scan button ── */}
      {!selected && (
        <button
          onClick={() => navigate("/scan")}
          className="absolute z-[1000] flex items-center gap-8"
          style={{
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            height: 52,
            padding: "0 28px",
            borderRadius: 999,
            background: colors.ink[900],
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 4px 24px rgba(15,15,14,0.3)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <QrCode size={20} />
          Взять в аренду
        </button>
      )}

      {/* ── Location card ── */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-12">
          <div
            style={{
              padding: 20,
              borderRadius: 20,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 4px 24px rgba(15,15,14,0.12)",
              border: "1px solid rgba(15,15,14,0.06)",
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="h3 m-0 truncate">{selected.name}</h3>
                <p className="body-sm text-ink-500 m-0 mt-4">{selected.address}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-ink-400 p-4 -mr-4 -mt-4">✕</button>
            </div>

            <div className="flex items-center gap-8 mt-12">
              <Badge variant={selected.available_devices > 0 ? "success" : "warning"} size="sm">
                {selected.available_devices > 0 ? `${selected.available_devices} свободно` : "Нет свободных"}
              </Badge>
            </div>

            <div className="flex gap-12 mt-16">
              <button
                onClick={() => window.open(`https://yandex.ru/maps/?rtext=~${selected.lat},${selected.lng}`, "_blank")}
                className="flex items-center gap-6 body-sm text-ink-500"
              >
                <Navigation size={16} /> Маршрут
              </button>

              <button
                  onClick={() => selected.available_devices > 0 && navigate(`/rent/${selected.id}`)}
                  disabled={selected.available_devices === 0}
                  className="flex-1 flex items-center justify-center gap-8"
                  style={{
                    height: 44, borderRadius: 999,
                    background: selected.available_devices > 0 ? colors.ink[900] : colors.ink[200],
                    color: selected.available_devices > 0 ? "#fff" : colors.ink[500],
                    fontWeight: 600, fontSize: 15,
                    border: "none",
                    cursor: selected.available_devices > 0 ? "pointer" : "not-allowed",
                    opacity: selected.available_devices > 0 ? 1 : 0.6,
                  }}
                >
                  {selected.available_devices > 0 ? "Взять здесь" : "Нет устройств"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
