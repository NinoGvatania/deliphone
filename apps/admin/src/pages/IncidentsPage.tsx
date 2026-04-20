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

type Incident = {
  id: string;
  type: string;
  severity: string;
  status: string;
  client_name: string;
  device_model: string;
  amount: number;
  description: string;
  created_at: string;
};

const COLUMNS = [
  { key: "reported", label: "Создан" },
  { key: "under_review", label: "Проверка" },
  { key: "quoted", label: "Оценка" },
  { key: "accepted", label: "Принят" },
  { key: "disputed", label: "Оспорен" },
  { key: "escalated", label: "Эскалация" },
  { key: "resolved", label: "Решён" },
] as const;

const SEVERITY_COLORS: Record<string, string> = {
  low: "blue",
  medium: "orange",
  high: "red",
  critical: "volcano",
};

const TYPE_ICONS: Record<string, string> = {
  damage: "💥",
  loss: "🔍",
  theft: "🚨",
  late_return: "⏰",
  fraud: "⚠️",
};

export function IncidentsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Incident | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "incidents"],
    queryFn: () => api<{ items: Incident[] }>("/incidents"),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      api(`/incidents/${id}/move`, { method: "POST", body: JSON.stringify({ status: to }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "incidents"] }),
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
        Инциденты
      </Title>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {grouped.map((col) => (
          <div
            key={col.key}
            style={{
              minWidth: 260,
              maxWidth: 300,
              flex: "1 0 260px",
            }}
          >
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              {col.label}{" "}
              <Badge count={col.items.length} style={{ marginLeft: 4 }} />
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
                  <Space direction="vertical" size={4}>
                    <Space>
                      <span>{TYPE_ICONS[item.type] ?? "📋"}</span>
                      <Tag color={SEVERITY_COLORS[item.severity]}>{item.severity}</Tag>
                    </Space>
                    <Text ellipsis>{item.client_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.device_model}
                    </Text>
                    {item.amount > 0 && (
                      <Text strong>{item.amount.toLocaleString("ru-RU")} ₽</Text>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        ))}
      </div>

      <Drawer
        title={`Инцидент: ${selected?.type ?? ""}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={600}
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
            <Descriptions.Item label="Тип">{selected.type}</Descriptions.Item>
            <Descriptions.Item label="Серьёзность">
              <Tag color={SEVERITY_COLORS[selected.severity]}>{selected.severity}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Клиент">{selected.client_name}</Descriptions.Item>
            <Descriptions.Item label="Устройство">{selected.device_model}</Descriptions.Item>
            <Descriptions.Item label="Сумма">
              {selected.amount.toLocaleString("ru-RU")} ₽
            </Descriptions.Item>
            <Descriptions.Item label="Описание">{selected.description}</Descriptions.Item>
            <Descriptions.Item label="Создан">{selected.created_at}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
