import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Space,
  Tag,
  Typography,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

type ServiceItem = {
  id: string;
  device_model: string;
  imei: string;
  status: string;
  issue: string;
  days_in_service: number;
  created_at: string;
};

const COLUMNS = [
  { key: "received", label: "Принято" },
  { key: "diagnosing", label: "Диагностика" },
  { key: "waiting_parts", label: "Запчасти" },
  { key: "repairing", label: "Ремонт" },
  { key: "testing", label: "Проверка" },
  { key: "done", label: "Готово" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  received: "blue",
  diagnosing: "orange",
  waiting_parts: "purple",
  repairing: "cyan",
  testing: "green",
  done: "default",
};

export function ServicePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ServiceItem | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "service"],
    queryFn: () => api<{ items: ServiceItem[] }>("/service"),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      api(`/service/${id}/move`, { method: "POST", body: JSON.stringify({ status: to }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "service"] }),
  });

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: (data?.items ?? []).filter((i) => i.status === col.key),
  }));

  const getNextStatus = (current: string): string | null => {
    const idx = COLUMNS.findIndex((c) => c.key === current);
    return idx < COLUMNS.length - 1 ? COLUMNS[idx + 1].key : null;
  };

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Сервис
      </Title>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
        {grouped.map((col) => (
          <div key={col.key} style={{ minWidth: 220, maxWidth: 280, flex: "1 0 220px" }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              {col.label} <Badge count={col.items.length} style={{ marginLeft: 4 }} />
            </Text>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {col.items.map((item) => (
                <Card
                  key={item.id}
                  size="small"
                  hoverable
                  onClick={() => setSelected(item)}
                  style={{ cursor: "pointer" }}
                >
                  <Space direction="vertical" size={2}>
                    <Text strong>{item.device_model}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      IMEI: …{item.imei.slice(-4)}
                    </Text>
                    <Tag color={STATUS_COLORS[item.status]}>{item.status}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.days_in_service} дн. в сервисе
                    </Text>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        ))}
      </div>

      <Drawer
        title={selected ? `${selected.device_model} — сервис` : "Сервис"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={500}
        extra={
          selected && getNextStatus(selected.status) ? (
            <Button
              type="primary"
              onClick={() => {
                const next = getNextStatus(selected.status);
                if (next) moveMut.mutate({ id: selected.id, to: next });
                setSelected(null);
              }}
            >
              → {COLUMNS.find((c) => c.key === getNextStatus(selected.status))?.label}
            </Button>
          ) : null
        }
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Модель">{selected.device_model}</Descriptions.Item>
            <Descriptions.Item label="IMEI">{selected.imei}</Descriptions.Item>
            <Descriptions.Item label="Проблема">{selected.issue}</Descriptions.Item>
            <Descriptions.Item label="Дней в сервисе">
              {selected.days_in_service}
            </Descriptions.Item>
            <Descriptions.Item label="Принято">{selected.created_at}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
