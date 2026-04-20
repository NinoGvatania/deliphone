import { useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;
const { Search } = Input;

type User = {
  id: string;
  telegram_name: string;
  username: string | null;
  kyc_status: string;
  status: string;
  total_rentals: number;
  created_at: string;
  phone: string;
  debt: number;
};

const KYC_COLORS: Record<string, string> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
  none: "default",
};

const STATUS_COLORS: Record<string, string> = {
  active: "green",
  suspended: "orange",
  blocked: "red",
  blacklisted: "volcano",
};

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("q", search);
      return api<{ items: User[]; total: number }>(`/users?${params}`);
    },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api(`/users/${id}/${action}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const columns: ColumnsType<User> = [
    { title: "Telegram", dataIndex: "telegram_name", ellipsis: true },
    { title: "Username", dataIndex: "username", render: (v) => v ?? "—" },
    {
      title: "KYC",
      dataIndex: "kyc_status",
      render: (s: string) => <Tag color={KYC_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    { title: "Аренды", dataIndex: "total_rentals", width: 80 },
    {
      title: "Регистрация",
      dataIndex: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Клиенты
      </Title>

      <Search
        placeholder="Поиск по имени или username"
        allowClear
        style={{ maxWidth: 400, marginBottom: 16 }}
        onSearch={setSearch}
      />

      <Table
        loading={isLoading}
        dataSource={data?.items ?? []}
        rowKey="id"
        columns={columns}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total,
          onChange: setPage,
        }}
        onRow={(record) => ({
          onClick: () => setSelected(record),
          style: { cursor: "pointer" },
        })}
      />

      <Drawer
        title={selected?.telegram_name ?? "Клиент"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={720}
        extra={
          <Space>
            <Button
              onClick={() => selected && actionMut.mutate({ id: selected.id, action: "suspend" })}
            >
              Заморозить
            </Button>
            <Button
              danger
              onClick={() => selected && actionMut.mutate({ id: selected.id, action: "block" })}
            >
              Заблокировать
            </Button>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "forgive-debt" })
              }
            >
              Списать долг
            </Button>
            <Button
              danger
              type="primary"
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "blacklist" })
              }
            >
              Чёрный список
            </Button>
          </Space>
        }
      >
        {selected && (
          <Tabs
            items={[
              {
                key: "profile",
                label: "Профиль",
                children: (
                  <Descriptions column={1}>
                    <Descriptions.Item label="Telegram">
                      {selected.telegram_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Username">
                      {selected.username ?? "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Телефон">{selected.phone}</Descriptions.Item>
                    <Descriptions.Item label="Статус">
                      <Tag color={STATUS_COLORS[selected.status]}>{selected.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Долг">
                      {selected.debt.toLocaleString("ru-RU")} ₽
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              { key: "kyc", label: "KYC", children: <Card>KYC данные</Card> },
              { key: "rentals", label: "Аренды", children: <Card>История аренд</Card> },
              { key: "payments", label: "Платежи", children: <Card>Платежи</Card> },
              { key: "debts", label: "Долги", children: <Card>Долги</Card> },
              { key: "incidents", label: "Инциденты", children: <Card>Инциденты</Card> },
            ]}
          />
        )}
      </Drawer>
    </>
  );
}
