import { useState } from "react";
import {
  DatePicker,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type AuditEntry = {
  id: string;
  admin_user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  ip: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
};

const ACTION_COLORS: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
  approve: "cyan",
  reject: "orange",
  move: "purple",
};

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    user?: string;
    action?: string;
    from?: string;
    to?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", page, filters],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filters.user) params.set("user", filters.user);
      if (filters.action) params.set("action", filters.action);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      return api<{ items: AuditEntry[]; total: number }>(`/audit-log?${params}`);
    },
  });

  const columns: ColumnsType<AuditEntry> = [
    { title: "Пользователь", dataIndex: "admin_user", width: 150 },
    {
      title: "Действие",
      dataIndex: "action",
      render: (s: string) => <Tag color={ACTION_COLORS[s] ?? "default"}>{s}</Tag>,
      width: 120,
    },
    { title: "Сущность", dataIndex: "entity_type", width: 120 },
    { title: "ID", dataIndex: "entity_id", ellipsis: true, width: 140 },
    {
      title: "Дата",
      dataIndex: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY HH:mm:ss"),
      width: 170,
    },
    { title: "IP", dataIndex: "ip", width: 130 },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Audit Log
      </Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="Действие"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          options={[
            { label: "Создание", value: "create" },
            { label: "Изменение", value: "update" },
            { label: "Удаление", value: "delete" },
            { label: "Одобрение", value: "approve" },
            { label: "Отклонение", value: "reject" },
            { label: "Перемещение", value: "move" },
          ]}
        />
        <RangePicker
          onChange={(_, ds) => {
            setFilters((f) => ({
              ...f,
              from: ds[0] || undefined,
              to: ds[1] || undefined,
            }));
          }}
        />
      </Space>

      <Table
        loading={isLoading}
        dataSource={data?.items ?? []}
        rowKey="id"
        columns={columns}
        pagination={{
          current: page,
          pageSize: 30,
          total: data?.total,
          onChange: setPage,
        }}
        expandable={{
          expandedRowRender: (record) =>
            record.changes ? (
              <div style={{ padding: 8 }}>
                {Object.entries(record.changes).map(([field, diff]) => (
                  <div key={field} style={{ marginBottom: 4 }}>
                    <Text strong>{field}: </Text>
                    <Text delete type="danger">
                      {JSON.stringify(diff.old)}
                    </Text>
                    {" → "}
                    <Text type="success">{JSON.stringify(diff.new)}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">Нет данных об изменениях</Text>
            ),
          rowExpandable: () => true,
        }}
      />
    </>
  );
}
