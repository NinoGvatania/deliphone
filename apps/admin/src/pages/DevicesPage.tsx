import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Check,
  Lock,
  MoreVertical,
  Plus,
  Power,
  Printer,
  QrCode,
  RotateCcw,
  Smartphone,
  Trash2,
} from "lucide-react";
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

type QrLabel = {
  short_code: string;
  imei: string;
  model: string;
  qr_url: string;
  qr_image: string;
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

function openPrintableQrLabel(label: QrLabel) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html><head><title>QR ${label.short_code}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
  .label { width: 280px; padding: 24px; text-align: center; border: 2px dashed #ccc; border-radius: 12px; }
  .qr { width: 200px; height: 200px; margin: 0 auto 16px; }
  .short-code { font-size: 32px; font-weight: 800; letter-spacing: 4px; margin-bottom: 8px; }
  .brand { font-size: 18px; font-weight: 700; color: #B8E600; margin-bottom: 4px; }
  .return-text { font-size: 12px; color: #666; margin-bottom: 8px; }
  .device-info { font-size: 10px; color: #999; }
  @media print {
    body { min-height: auto; }
    .label { border: none; padding: 0; }
  }
</style></head><body>
<div class="label">
  <div class="brand">Делифон</div>
  <img class="qr" src="${label.qr_image}" alt="QR" />
  <div class="short-code">${label.short_code}</div>
  <div class="return-text">Верни в любую точку — 500 &#8381;</div>
  <div class="device-info">${label.model} &middot; IMEI ...${label.imei.slice(-4)}</div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}

export function DevicesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Device | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; custody?: string; location?: string }>({});
  const [form] = Form.useForm();
  const [mdmAction, setMdmAction] = useState<{ action: string; label: string } | null>(null);
  const [enrollQrOpen, setEnrollQrOpen] = useState(false);
  const [enrollQrDevice, setEnrollQrDevice] = useState<Device | null>(null);

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

  const enrollMut = useMutation({
    mutationFn: (deviceId: string) =>
      api<{ token: string | null; qr_code: string | null; raw: Record<string, unknown> }>(
        `/devices/${deviceId}/mdm/enroll`,
        { method: "POST", body: JSON.stringify({ policy_id: "normal_policy", duration: "3600s" }) },
      ),
  });

  const qrLabelMut = useMutation({
    mutationFn: (deviceId: string) => api<QrLabel>(`/devices/${deviceId}/qr-label`),
    onSuccess: (label) => openPrintableQrLabel(label),
  });

  function handleRowMdmQr(device: Device) {
    setEnrollQrDevice(device);
    setEnrollQrOpen(true);
    enrollMut.mutate(device.id);
  }

  function handleRowPrintQr(device: Device) {
    qrLabelMut.mutate(device.id);
  }

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
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_: unknown, record: Device) => {
        const items: MenuProps["items"] = [
          {
            key: "mdm-qr",
            icon: <Smartphone size={14} />,
            label: "MDM QR",
            onClick: (e) => { e.domEvent.stopPropagation(); handleRowMdmQr(record); },
          },
          {
            key: "print-qr",
            icon: <Printer size={14} />,
            label: "Печать QR",
            onClick: (e) => { e.domEvent.stopPropagation(); handleRowPrintQr(record); },
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button
              type="text"
              size="small"
              icon={<MoreVertical size={16} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
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
                            onClick={() => handleRowMdmQr(selected)}
                          >
                            Enroll Device
                          </Button>
                        )}
                        <Button
                          icon={<Printer size={14} />}
                          onClick={() => handleRowPrintQr(selected)}
                        >
                          Печать QR
                        </Button>
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

      {/* MDM Enrollment QR modal */}
      <Modal
        title="MDM Enrollment QR"
        open={enrollQrOpen}
        onCancel={() => { setEnrollQrOpen(false); setEnrollQrDevice(null); enrollMut.reset(); }}
        footer={<Button onClick={() => { setEnrollQrOpen(false); setEnrollQrDevice(null); enrollMut.reset(); }}>Закрыть</Button>}
        width={420}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          {enrollMut.isPending && <Spin size="large" style={{ margin: "40px 0" }} />}
          {enrollMut.isError && (
            <Text type="danger">
              {enrollMut.error instanceof Error ? enrollMut.error.message : "Ошибка MDM API"}
            </Text>
          )}
          {enrollMut.isSuccess && (
            <>
              <p style={{ marginBottom: 16 }}>Отсканируйте камерой нового устройства при первой настройке:</p>
              {enrollMut.data.qr_code ? (
                <>
                  <QrCanvas data={enrollMut.data.qr_code} size={250} />
                  {enrollMut.data.token && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <Text copyable={{ text: enrollMut.data.token }} type="secondary" style={{ fontSize: 11 }}>
                        Токен: {enrollMut.data.token}
                      </Text>
                    </div>
                  )}
                </>
              ) : (
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
              )}
              {enrollQrDevice && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">{enrollQrDevice.model} ({enrollQrDevice.short_code})</Text>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Add device modal */}
      {addOpen && <AddDeviceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ["admin", "devices"] }); }}
      />}
    </>
  );
}

type CreatedDevice = { id: string; short_code: string; model: string; imei: string };

function AddDeviceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [imei, setImei] = useState("");
  const [model, setModel] = useState("Xiaomi Redmi A5");
  const [color, setColor] = useState("");
  const [storage, setStorage] = useState("128GB");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedDevice | null>(null);

  const enrollMut = useMutation({
    mutationFn: (deviceId: string) =>
      api<{ token: string | null; qr_code: string | null; raw: Record<string, unknown> }>(
        `/devices/${deviceId}/mdm/enroll`,
        { method: "POST", body: JSON.stringify({ policy_id: "normal_policy", duration: "3600s" }) },
      ),
  });

  const qrLabelMut = useMutation({
    mutationFn: (deviceId: string) => api<QrLabel>(`/devices/${deviceId}/qr-label`),
    onSuccess: (label) => openPrintableQrLabel(label),
  });

  async function handleCreate() {
    if (!imei.trim()) { setError("IMEI обязателен"); return; }
    setLoading(true); setError(null);
    try {
      const result = await api<CreatedDevice>("/devices", {
        method: "POST",
        body: JSON.stringify({
          imei: imei.trim(),
          model: model.trim() || "Xiaomi Redmi A5",
          color: color.trim() || undefined,
          storage,
        }),
      });
      setCreated(result);
    } catch (e: any) {
      setError(e.message || "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  function handleAddAnother() {
    setCreated(null);
    setImei("");
    setColor("");
    setError(null);
    enrollMut.reset();
    qrLabelMut.reset();
  }

  function handleClose() {
    if (created) onCreated();
    onClose();
  }

  if (created) {
    return (
      <Modal title="Устройство создано" open={open} onCancel={handleClose} footer={null} width={460}>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={28} style={{ color: "#1E8E4F" }} />
          </div>
          <Title level={4} style={{ margin: "0 0 4px" }}>{created.model}</Title>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3, marginBottom: 4 }}>{created.short_code}</div>
          <Text type="secondary">IMEI: ...{created.imei.slice(-4)}</Text>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            <Button
              type="primary"
              icon={<Smartphone size={16} />}
              size="large"
              loading={enrollMut.isPending}
              onClick={() => enrollMut.mutate(created.id)}
              style={{ height: 48, borderRadius: 999 }}
            >
              Зарегистрировать в MDM
            </Button>

            {enrollMut.isSuccess && (
              <div style={{ background: "#f6f6f6", borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  Отсканируйте камерой нового устройства при первой настройке:
                </Text>
                {enrollMut.data.qr_code ? (
                  <img
                    src={`data:image/png;base64,${enrollMut.data.qr_code}`}
                    alt="MDM QR"
                    style={{ width: 200, height: 200, margin: "0 auto", display: "block" }}
                  />
                ) : enrollMut.data.token ? (
                  <QrCanvas data={enrollMut.data.token} size={200} />
                ) : (
                  <Text type="warning">Токен не получен</Text>
                )}
              </div>
            )}
            {enrollMut.isError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                MDM: {enrollMut.error instanceof Error ? enrollMut.error.message : "Ошибка"}
              </Text>
            )}

            <Button
              icon={<Printer size={16} />}
              size="large"
              loading={qrLabelMut.isPending}
              onClick={() => qrLabelMut.mutate(created.id)}
              style={{ height: 48, borderRadius: 999 }}
            >
              Печать QR-наклейки
            </Button>
          </div>

          <Button type="link" onClick={handleAddAnother} style={{ marginTop: 16 }}>
            Добавить ещё
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Добавить устройство" open={open} onCancel={handleClose} footer={null}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
        <div>
          <Text strong>IMEI *</Text>
          <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="123456789012345" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text strong>Модель *</Text>
          <Input value={model} onChange={(e) => setModel(e.target.value)} style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text strong>Цвет</Text>
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Чёрный" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text strong>Память</Text>
          <Select value={storage} onChange={setStorage} style={{ width: "100%", marginTop: 4 }} options={[
            { label: "64 GB", value: "64GB" },
            { label: "128 GB", value: "128GB" },
            { label: "256 GB", value: "256GB" },
          ]} />
        </div>
        {error && <Text type="danger">{error}</Text>}
        <Button type="primary" block loading={loading} onClick={handleCreate} style={{ height: 44, borderRadius: 999 }}>
          Создать
        </Button>
      </div>
    </Modal>
  );
}

function QrCanvas({ data, size = 250 }: { data: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, data, { width: size, margin: 2 }, (err: any) => {
        if (err) console.error("QR render error:", err);
      });
    });
  }, [data, size]);

  return <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />;
}
