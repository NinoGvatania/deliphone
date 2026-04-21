import { useState } from "react";
import {
  Badge,
  Card,
  Descriptions,
  Drawer,
  Radio,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";

const { Title } = Typography;

function svgIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
}
const greenIcon = svgIcon("#1E8E4F");
const yellowIcon = svgIcon("#B8730A");
const greyIcon = svgIcon("#9C9C95");

type Location = {
  id: string;
  name: string;
  address: string;
  partner_name: string;
  working_hours: string;
  devices_count: number;
  active_rentals: number;
  status: string;
  lat: number | null;
  lng: number | null;
};

export function LocationsPage() {
  const [selected, setSelected] = useState<Location | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () => api<{ items: Location[]; total: number }>("/locations"),
  });

  const locations = data?.items ?? [];

  const columns: ColumnsType<Location> = [
    { title: "Название", dataIndex: "name", ellipsis: true },
    { title: "Адрес", dataIndex: "address", ellipsis: true },
    { title: "Партнёр", dataIndex: "partner_name", ellipsis: true },
    {
      title: "Статус", dataIndex: "status", width: 100,
      render: (s: string) => (
        <Tag color={s === "active" ? "green" : s === "paused" ? "orange" : "default"}>
          {s === "active" ? "Работает" : s === "paused" ? "Пауза" : "Закрыта"}
        </Tag>
      ),
    },
    { title: "Устройств", dataIndex: "devices_count", width: 100 },
    { title: "Аренд", dataIndex: "active_rentals", width: 80 },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Точки выдачи</Title>
        <Radio.Group value={view} onChange={(e) => setView(e.target.value)} buttonStyle="solid">
          <Radio.Button value="list">Список</Radio.Button>
          <Radio.Button value="map">Карта</Radio.Button>
        </Radio.Group>
      </div>

      {view === "list" ? (
        <Table
          loading={isLoading}
          dataSource={locations}
          rowKey="id"
          columns={columns}
          pagination={{ pageSize: 20, total: data?.total }}
          onRow={(record) => ({
            onClick: () => setSelected(record),
            style: { cursor: "pointer" },
          })}
        />
      ) : (
        <Card bodyStyle={{ padding: 0, height: 600 }}>
          <MapContainer
            center={[55.7558, 37.6173]}
            zoom={11}
            style={{ height: "100%", width: "100%", borderRadius: 8 }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations
              .filter((loc) => loc.lat != null && loc.lng != null)
              .map((loc) => (
                <Marker
                  key={loc.id}
                  position={[loc.lat!, loc.lng!]}
                  icon={
                    loc.status !== "active"
                      ? greyIcon
                      : loc.devices_count > 0
                        ? greenIcon
                        : yellowIcon
                  }
                  eventHandlers={{ click: () => setSelected(loc) }}
                >
                  <Popup>
                    <strong>{loc.name}</strong>
                    <br />
                    {loc.address}
                    <br />
                    Устройств: {loc.devices_count}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </Card>
      )}

      <Drawer
        title={selected?.name ?? "Точка"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={600}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Название">{selected.name}</Descriptions.Item>
            <Descriptions.Item label="Адрес">{selected.address}</Descriptions.Item>
            <Descriptions.Item label="Партнёр">{selected.partner_name}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={selected.status === "active" ? "green" : "default"}>
                {selected.status === "active" ? "Работает" : selected.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Часы работы">{selected.working_hours}</Descriptions.Item>
            <Descriptions.Item label="Устройств">{selected.devices_count}</Descriptions.Item>
            <Descriptions.Item label="Активных аренд">{selected.active_rentals}</Descriptions.Item>
            {selected.lat != null && (
              <Descriptions.Item label="Координаты">
                {selected.lat}, {selected.lng}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
