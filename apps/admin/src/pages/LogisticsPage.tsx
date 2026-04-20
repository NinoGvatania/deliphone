import { Card, Col, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;

type Movement = {
  id: string;
  device_model: string;
  short_code: string;
  from_location: string;
  to_location: string;
  status: string;
  created_at: string;
};

type LocationBalance = {
  id: string;
  address: string;
  surplus: number;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  in_transit: "blue",
  delivered: "green",
  cancelled: "default",
};

export function LogisticsPage() {
  const { data: movements, isLoading } = useQuery({
    queryKey: ["admin", "logistics", "movements"],
    queryFn: () => api<{ items: Movement[]; total: number }>("/logistics/movements"),
  });

  const { data: balances } = useQuery({
    queryKey: ["admin", "logistics", "balances"],
    queryFn: () => api<{ items: LocationBalance[] }>("/logistics/balances"),
  });

  const columns: ColumnsType<Movement> = [
    { title: "Устройство", dataIndex: "device_model" },
    { title: "Код", dataIndex: "short_code", width: 80 },
    { title: "Откуда", dataIndex: "from_location", ellipsis: true },
    { title: "Куда", dataIndex: "to_location", ellipsis: true },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Логистика
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Карта баланса точек"
            style={{
              height: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "#999", textAlign: "center" }}>
              Карта с маркерами точек
              <br />
              (цвет по surplus/deficit)
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Баланс точек" style={{ height: 300, overflow: "auto" }}>
            {(balances?.items ?? []).map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                  {b.address}
                </span>
                <Tag color={b.surplus > 0 ? "green" : b.surplus < 0 ? "red" : "default"}>
                  {b.surplus > 0 ? `+${b.surplus}` : b.surplus}
                </Tag>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card title="История перемещений">
        <Table
          loading={isLoading}
          dataSource={movements?.items ?? []}
          rowKey="id"
          columns={columns}
          pagination={{ pageSize: 20, total: movements?.total }}
        />
      </Card>
    </>
  );
}
