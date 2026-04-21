import { useState } from "react";
import {
  Alert,
  Card,
  Col,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { AlertOctagon, Clock, Smartphone, UserCheck, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors } from "@deliphone/ui/tokens";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

type Period = "today" | "week" | "month" | "year";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () =>
      api<{
        active_rentals: number;
        kyc_queue: number;
        incidents: number;
        devices_total: number;
        devices_free: number;
        revenue_today: number;
      }>("/dashboard"),
  });

  const { data: finances, isLoading: finLoading } = useQuery({
    queryKey: ["admin", "dashboard", "finances", period],
    queryFn: () =>
      api<{ rows: { label: string; amount: number }[] }>(
        `/dashboard/finances?period=${period}`,
      ),
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin", "dashboard", "metrics"],
    queryFn: () =>
      api<{
        revenue_30d: { date: string; value: number }[];
        registrations: { date: string; value: number }[];
        utilization: { date: string; value: number }[];
      }>("/dashboard/metrics"),
  });

  const { data: alerts } = useQuery({
    queryKey: ["admin", "dashboard", "alerts"],
    queryFn: () =>
      api<{ items: { id: string; type: string; message: string; severity: string }[] }>(
        "/dashboard/alerts",
      ),
  });

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Дашборд
      </Title>

      {kpiLoading ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Активных аренд"
                value={kpi?.active_rentals ?? 0}
                prefix={<Clock size={16} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="KYC в очереди"
                value={kpi?.kyc_queue ?? 0}
                prefix={<UserCheck size={16} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Инцидентов"
                value={kpi?.incidents ?? 0}
                prefix={<AlertOctagon size={16} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Устройства"
                value={`${kpi?.devices_free ?? 0} / ${kpi?.devices_total ?? 0}`}
                prefix={<Smartphone size={16} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="Выручка сегодня"
                value={kpi?.revenue_today ?? 0}
                prefix={<Wallet size={16} />}
                suffix="₽"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Finance P&L */}
      <Card style={{ marginTop: 24 }} title="Финансы">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Segmented
            options={[
              { label: "Сегодня", value: "today" },
              { label: "Неделя", value: "week" },
              { label: "Месяц", value: "month" },
              { label: "Год", value: "year" },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as Period)}
          />
          <Table
            loading={finLoading}
            dataSource={finances?.rows ?? []}
            rowKey="label"
            pagination={false}
            size="small"
            columns={[
              { title: "Статья", dataIndex: "label" },
              {
                title: "Сумма, ₽",
                dataIndex: "amount",
                align: "right",
                render: (v: number) => v.toLocaleString("ru-RU"),
              },
            ]}
          />
        </Space>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Выручка, 30 дней">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={metrics?.revenue_30d ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.accent.DEFAULT}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Регистрации">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics?.registrations ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={colors.accent.DEFAULT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Утилизация устройств">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics?.utilization ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.accent.DEFAULT}
                  fill={colors.accent.soft}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {alerts?.items && alerts.items.length > 0 && (
        <Card title="Требует внимания" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            {alerts.items.map((a) => (
              <Alert
                key={a.id}
                message={a.message}
                type={
                  a.severity === "critical"
                    ? "error"
                    : a.severity === "warning"
                      ? "warning"
                      : "info"
                }
                showIcon
              />
            ))}
          </Space>
        </Card>
      )}
    </>
  );
}
