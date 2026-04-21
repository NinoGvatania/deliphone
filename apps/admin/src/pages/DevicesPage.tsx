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
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Lock, Plus, Power, QrCode, RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

type Device = {
  id: string;
  imei: string;
  model: string;
  short_code: string;
  custody: string;
  location: string;
  status: string;
  total_rentals: number;
  battery_level: number | null;
  photos: string[];
  specs: Record<string, string>;
  movements: { date: string; from: string; to: string; reason: string }[];
  mdm?: {
    enrolled: boolean;
    compliance: boolean;
    last_sync: string | null;
    policy_name: string | null;
  };
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
  const [mdmAction, setMdmAction] = useState<{ action: string; label: string } | null>(null);
  const [enrollQrOpen, setEnrollQrOpen] = useState(false);

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

  const mdmMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api(`/devices/${id}/mdm/${action}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "devices"] });
      setMdmAction(null);
    },
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
    {
      title: "Заряд",
      dataIndex: "battery_level",
      width: 90,
      render: (v: number | null) => {
        if (v == null) return <Text type="secondary">—</Text>;
        const color = v > 60 ? "#1E8E4F" : v > 20 ? "#B8730A" : "#D2342A";
        const Ico = v > 80 ? BatteryFull : v > 40 ? BatteryMedium : v > 15 ? BatteryLow : Battery;
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Ico size={16} style={{ color }} />
            <span style={{ color, fontSize: 12, fontWeight: 500 }}>{v}%</span>
          </span>
        );
      },
    },
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
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: "info",
                label: "Информация",
                children: (
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
                ),
              },
              {
                key: "mdm",
                label: "MDM",
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Card title="MDM статус">
                      <Space direction="vertical" size={8}>
                        <div>
                          <Text type="secondary">Статус: </Text>
                          {selected.mdm?.enrolled ? (
                            <Tag color="green">Enrolled</Tag>
                          ) : (
                            <Tag color="default">Not enrolled</Tag>
                          )}
                        </div>
                        <div>
                          <Text type="secondary">Compliance: </Text>
                          {selected.mdm?.compliance ? (
                            <Tag color="green">Compliant</Tag>
                          ) : (
                            <Tag color="orange">Non-compliant</Tag>
                          )}
                        </div>
                        <div>
                          <Text type="secondary">Last sync: </Text>
                          <Text>{selected.mdm?.last_sync ?? "Never"}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Policy: </Text>
                          <Text>{selected.mdm?.policy_name ?? "None"}</Text>
                        </div>
                      </Space>
                    </Card>

                    <Card title="Действия">
                      <Space wrap>
                        {!selected.mdm?.enrolled && (
                          <Button
                            icon={<QrCode size={14} />}
                            onClick={() => setEnrollQrOpen(true)}
                          >
                            Enroll Device
                          </Button>
                        )}
                        <Button
                          icon={<Lock size={14} />}
                          onClick={() => setMdmAction({ action: "lock", label: "Lock" })}
                        >
                          Lock
                        </Button>
                        <Button
                          icon={<RotateCcw size={14} />}
                          onClick={() => setMdmAction({ action: "reboot", label: "Reboot" })}
                        >
                          Reboot
                        </Button>
                        <Button
                          onClick={() => setMdmAction({ action: "reset-password", label: "Reset Password" })}
                        >
                          Reset Password
                        </Button>
                        <Button
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => setMdmAction({ action: "wipe", label: "Wipe" })}
                        >
                          Wipe
                        </Button>
                      </Space>
                    </Card>

                    <Card title="Ссылки">
                      <a
                        href="https://admin.google.com/ac/chrome/devices"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google MDM Console
                      </a>
                    </Card>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* MDM action confirmation modal */}
      <Modal
        title={`Подтвердите: ${mdmAction?.label}`}
        open={!!mdmAction}
        onCancel={() => setMdmAction(null)}
        onOk={() =>
          selected && mdmAction && mdmMut.mutate({ id: selected.id, action: mdmAction.action })
        }
        okText="Выполнить"
        okButtonProps={{ danger: mdmAction?.action === "wipe" }}
        confirmLoading={mdmMut.isPending}
      >
        <p>
          {mdmAction?.action === "wipe"
            ? "ВНИМАНИЕ: Это действие полностью сотрёт все данные на устройстве. Действие необратимо."
            : `Вы уверены, что хотите выполнить "${mdmAction?.label}" для устройства ${selected?.model}?`}
        </p>
      </Modal>

      {/* Enroll QR modal */}
      <Modal
        title="Enrollment QR"
        open={enrollQrOpen}
        onCancel={() => setEnrollQrOpen(false)}
        footer={<Button onClick={() => setEnrollQrOpen(false)}>Закрыть</Button>}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p>Отсканируйте QR-код на устройстве для enrollment в MDM:</p>
          <div
            style={{
              width: 200,
              height: 200,
              margin: "16px auto",
              background: "#f5f5f5",
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QrCode size={120} strokeWidth={1} />
          </div>
          <Text type="secondary">
            QR генерируется через Google MDM API при подключении к интернету
          </Text>
        </div>
      </Modal>

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
