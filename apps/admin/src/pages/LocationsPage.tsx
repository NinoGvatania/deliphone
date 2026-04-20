import { useState } from "react";
import {
  Card,
  Col,
  Descriptions,
  Drawer,
  Row,
  Statistic,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title } = Typography;

type Location = {
  id: string;
  address: string;
  partner_name: string;
  working_hours: string;
  devices_count: number;
  active_rentals: number;
  lat: number;
  lng: number;
};

export function LocationsPage() {
  const [selected, setSelected] = useState<Location | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () => api<{ items: Location[]; total: number }>("/locations"),
  });

  const columns: ColumnsType<Location> = [
    { title: "Адрес", dataIndex: "address", ellipsis: true },
    { title: "Партнёр", dataIndex: "partner_name", ellipsis: true },
    { title: "Часы работы", dataIndex: "working_hours", width: 140 },
    { title: "Устройств", dataIndex: "devices_count", width: 100 },
    { title: "Аренд", dataIndex: "active_rentals", width: 80 },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Точки выдачи
      </Title>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Table
            loading={isLoading}
            dataSource={data?.items ?? []}
            rowKey="id"
            columns={columns}
            pagination={{ pageSize: 20, total: data?.total }}
            onRow={(record) => ({
              onClick: () => setSelected(record),
              style: { cursor: "pointer" },
            })}
          />
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Карта"
            style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div style={{ color: "#999", textAlign: "center" }}>
              Карта с маркерами точек
              <br />
              (интеграция Yandex Maps)
            </div>
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selected?.address ?? "Точка"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={600}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Адрес">{selected.address}</Descriptions.Item>
            <Descriptions.Item label="Партнёр">{selected.partner_name}</Descriptions.Item>
            <Descriptions.Item label="Часы работы">
              {selected.working_hours}
            </Descriptions.Item>
            <Descriptions.Item label="Устройств">
              {selected.devices_count}
            </Descriptions.Item>
            <Descriptions.Item label="Активных аренд">
              {selected.active_rentals}
            </Descriptions.Item>
            <Descriptions.Item label="Координаты">
              {selected.lat}, {selected.lng}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
