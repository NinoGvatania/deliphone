import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { Button, Badge, Card } from "@deliphone/ui";
import { Navigation } from "lucide-react";
import { locationsApi, type LocationBrief } from "@/api/locations";

// Fix leaflet default marker icons (Vite bundles assets differently)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const yellowIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const greyIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function getMarkerIcon(loc: LocationBrief) {
  if (loc.status !== "active") return greyIcon;
  return loc.available_devices > 0 ? greenIcon : yellowIcon;
}

function FlyToUser() {
  const map = useMap();
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 14),
      () => {},
      { enableHighAccuracy: false },
    );
  }, [map]);
  return null;
}

export function MapPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LocationBrief | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list(),
  });

  const center: [number, number] = [55.7558, 37.6173];

  return (
    <div className="relative h-full">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        style={{ minHeight: "calc(100vh - 112px)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToUser />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={getMarkerIcon(loc)}
            eventHandlers={{ click: () => setSelected(loc) }}
          />
        ))}
      </MapContainer>

      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-16 animate-delifon-slideup">
          <Card variant="elevated" padding={20}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="h3 m-0 truncate">{selected.name}</h3>
                <p className="body-sm text-ink-500 m-0 mt-4">
                  {selected.address}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-ink-400 p-4 -mr-4 -mt-4"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-8 mt-12">
              <Badge
                variant={
                  selected.available_devices > 0 ? "success" : "warning"
                }
                size="sm"
              >
                {selected.available_devices > 0
                  ? `${selected.available_devices} устройств`
                  : "Нет свободных"}
              </Badge>
              <Badge
                variant={selected.status === "active" ? "neutral" : "outline"}
                size="sm"
              >
                {selected.status === "active" ? "Открыто" : "Закрыто"}
              </Badge>
            </div>
            <div className="flex gap-12 mt-16">
              <Button
                variant="ghost"
                size="md"
                icon={Navigation}
                onClick={() =>
                  window.open(
                    `https://yandex.ru/maps/?rtext=~${selected.lat},${selected.lng}`,
                    "_blank",
                  )
                }
              >
                Маршрут
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={selected.available_devices === 0}
                onClick={() => navigate(`/booking/${selected.id}`)}
              >
                Забронировать
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
