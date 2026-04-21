import { useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Input,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type Rental = {
  id: string;
  user_name: string;
  device_model: string;
  short_code: string;
  location: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  total_paid: number;
  payments: { id: string; amount: number; type: string; date: string }[];
  incidents: { id: string; type: string; status: string }[];
};

const STATUS_STEPS: Record<string, number> = {
  booked: 0,
  issued: 1,
  active: 2,
  charging: 3,
  returned: 4,
  closed: 5,
};

const STATUS_COLORS: Record<string, string> = {
  booked: "blue",
  issued: "cyan",
  active: "green",
  charging: "orange",
  returned: "purple",
  closed: "default",
  overdue: "red",
};

export function RentalsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Rental | null>(null);
  const [filters, setFilters] = useState<{
    status?: string;
    q?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "rentals", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.q) params.set("q", filters.q);
      return api<{ items: Rental[]; total: number }>(`/rentals?${params}`);
    },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: unknown }) =>
      api(`/rentals/${id}/${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "rentals"] }),
  });

  const columns: ColumnsType<Rental> = [
    { title: "Клиент", dataIndex: "user_name", ellipsis: true },
    { title: "Устройство", dataIndex: "device_model" },
    { title: "Код", dataIndex: "short_code", width: 80 },
    { title: "Точка", dataIndex: "location", ellipsis: true },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Начало",
      dataIndex: "started_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    {
      title: "Оплачено",
      dataIndex: "total_paid",
      render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Аренды
      </Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Клиент или устройство"
          allowClear
          style={{ width: 250 }}
          onSearch={(v) => setFilters((f) => ({ ...f, q: v || undefined }))}
        />
        <Select
          placeholder="Статус"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={Object.keys(STATUS_COLORS).map((s) => ({ label: s, value: s }))}
        />
      </Space>

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

      <Drawer
        title={selected ? `Аренда ${selected.short_code}` : "Аренда"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={700}
        extra={
          <Space>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "extend" })
              }
            >
              Продлить
            </Button>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "discount" })
              }
            >
              Скидка
            </Button>
            <Button
              danger
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "force-close" })
              }
            >
              Принудительно закрыть
            </Button>
          </Space>
        }
      >
        {selected && (
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Card title="Таймлайн">
              <Steps
                current={STATUS_STEPS[selected.status] ?? 0}
                size="small"
                items={[
                  { title: "Бронь" },
                  { title: "Выдача" },
                  { title: "Активна" },
                  { title: "Списания" },
                  { title: "Возврат" },
                  { title: "Закрыта" },
                ]}
              />
            </Card>

            <Card title="Платежи">
              <Table
                size="small"
                dataSource={selected.payments}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: "Тип", dataIndex: "type" },
                  {
                    title: "Сумма",
                    dataIndex: "amount",
                    render: (v: number) => `${v} ₽`,
                  },
                  {
                    title: "Дата",
                    dataIndex: "date",
                    render: (d: string) => dayjs(d).format("DD.MM.YY HH:mm"),
                  },
                ]}
              />
            </Card>

            {selected.incidents.length > 0 && (
              <Card title="Инциденты">
                <Table
                  size="small"
                  dataSource={selected.incidents}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: "Тип", dataIndex: "type" },
                    { title: "Статус", dataIndex: "status" },
                  ]}
                />
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
}
