import { Card, Col, Row, Statistic, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;

type Subscription = {
  id: string;
  user_name: string;
  plan: string;
  started_at: string;
  next_charge: string;
  amount: number;
  status: string;
};

type SubStats = {
  total_active: number;
  churn_rate: number;
  avg_lifetime_days: number;
  monthly_revenue: number;
};

export function SubscriptionsPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "subscriptions", "stats"],
    queryFn: () => api<SubStats>("/subscriptions/stats"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: () => api<{ items: Subscription[]; total: number }>("/subscriptions"),
  });

  const columns: ColumnsType<Subscription> = [
    { title: "Клиент", dataIndex: "user_name", ellipsis: true },
    { title: "Тариф", dataIndex: "plan" },
    { title: "Сумма", dataIndex: "amount", render: (v: number) => `${v} ₽` },
    {
      title: "Начало",
      dataIndex: "started_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    {
      title: "След. списание",
      dataIndex: "next_charge",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    { title: "Статус", dataIndex: "status" },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Подписки
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Активных" value={stats?.total_active ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Churn rate"
              value={stats?.churn_rate ?? 0}
              suffix="%"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Средний LT"
              value={stats?.avg_lifetime_days ?? 0}
              suffix="дн."
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="MRR"
              value={stats?.monthly_revenue ?? 0}
              suffix="₽"
            />
          </Card>
        </Col>
      </Row>

      <Table
        loading={isLoading}
        dataSource={data?.items ?? []}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 20, total: data?.total }}
      />
    </>
  );
}
