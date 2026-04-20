import { useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title } = Typography;

type Device = {
  id: string;
  imei: string;
  model: string;
  short_code: string;
  custody: string;
  location: string;
  status: string;
  total_rentals: number;
  photos: string[];
  specs: Record<string, string>;
  movements: { date: string; from: string; to: string; reason: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  available: "green",
  rented: "blue",
  service: "orange",
  written_off: "red",
  transit: "purple",
};

const CUSTODY_COLORS: Record<string, string> = {
  platform: "blue",
  partner: "green",
  client: "orange",
};

export function DevicesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Device | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; custody?: string; location?: string }>({});
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "devices", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.custody) params.set("custody", filters.custody);
      if (filters.location) params.set("location", filters.location);
      return api<{ items: Device[]; total: number }>(`/devices?${params}`);
    },
  });

  const addMut = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api("/devices", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "devices"] });
      setAddOpen(false);
      form.resetFields();
    },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api(`/devices/${id}/${action}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "devices"] }),
  });

  const columns: ColumnsType<Device> = [
    {
      title: "IMEI",
      dataIndex: "imei",
      render: (v: string) => `…${v.slice(-4)}`,
      width: 80,
    },
    { title: "Модель", dataIndex: "model" },
    { title: "Код", dataIndex: "short_code", width: 80 },
    {
      title: "Хранение",
      dataIndex: "custody",
      render: (s: string) => <Tag color={CUSTODY_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    { title: "Точка", dataIndex: "location", ellipsis: true },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    { title: "Аренды", dataIndex: "total_rentals", width: 80 },
  ];

  return (
    <>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          Устройства
        </Title>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
          Добавить
        </Button>
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="Статус"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={[
            { label: "Доступен", value: "available" },
            { label: "В аренде", value: "rented" },
            { label: "Сервис", value: "service" },
            { label: "Списан", value: "written_off" },
            { label: "Транзит", value: "transit" },
          ]}
        />
        <Select
          placeholder="Хранение"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setFilters((f) => ({ ...f, custody: v }))}
          options={[
            { label: "Платформа", value: "platform" },
            { label: "Партнёр", value: "partner" },
            { label: "Клиент", value: "client" },
          ]}
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

      {/* Detail drawer */}
      <Drawer
        title={selected ? `${selected.model} (${selected.short_code})` : "Устройство"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={700}
        extra={
          <Space>
            <Button
              onClick={() => selected && actionMut.mutate({ id: selected.id, action: "move" })}
            >
              Перемещение
            </Button>
            <Button
              onClick={() => selected && actionMut.mutate({ id: selected.id, action: "service" })}
            >
              В сервис
            </Button>
            <Button
              danger
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "write-off" })
              }
            >
              Списать
            </Button>
          </Space>
        }
      >
        {selected && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Характеристики">
              {Object.entries(selected.specs).map(([k, v]) => (
                <div key={k}>
                  <strong>{k}:</strong> {v}
                </div>
              ))}
            </Card>

            <Card title="Перемещения">
              <Timeline
                items={selected.movements.map((m) => ({
                  children: `${m.date}: ${m.from} → ${m.to} (${m.reason})`,
                }))}
              />
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Add device modal */}
      <Modal
        title="Добавить устройство"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => form.submit()}
        okText="Создать"
      >
        <Form form={form} layout="vertical" onFinish={(v) => addMut.mutate(v)}>
          <Form.Item name="imei" label="IMEI" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Модель" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="serial" label="Серийный номер">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Цвет">
            <Input />
          </Form.Item>
          <Form.Item name="storage" label="Память">
            <Select options={[
              { label: "64 GB", value: "64" },
              { label: "128 GB", value: "128" },
              { label: "256 GB", value: "256" },
              { label: "512 GB", value: "512" },
              { label: "1 TB", value: "1024" },
            ]} />
          </Form.Item>
          <Form.Item name="condition" label="Состояние">
            <Select options={[
              { label: "Новое", value: "new" },
              { label: "Отличное", value: "excellent" },
              { label: "Хорошее", value: "good" },
              { label: "Удовл.", value: "fair" },
            ]} />
          </Form.Item>
          <Form.Item name="location_id" label="Точка">
            <Input placeholder="UUID точки" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
