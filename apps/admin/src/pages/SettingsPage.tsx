import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title } = Typography;

type Tariff = {
  id: string;
  name: string;
  device_model: string;
  period_hours: number;
  price: number;
  is_active: boolean;
};

type DamagePrice = {
  id: string;
  device_model: string;
  category: string;
  subcategory: string;
  price: number;
};

type Staff = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export function SettingsPage() {
  const qc = useQueryClient();
  const [tariffOpen, setTariffOpen] = useState(false);
  const [damageOpen, setDamageOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [tariffForm] = Form.useForm();
  const [damageForm] = Form.useForm();
  const [staffForm] = Form.useForm();

  const { data: tariffs, isLoading: tariffsLoading } = useQuery({
    queryKey: ["admin", "settings", "tariffs"],
    queryFn: () => api<{ items: Tariff[] }>("/settings/tariffs"),
  });

  const { data: damages, isLoading: damagesLoading } = useQuery({
    queryKey: ["admin", "settings", "damages"],
    queryFn: () => api<{ items: DamagePrice[] }>("/settings/damages"),
  });

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ["admin", "settings", "staff"],
    queryFn: () => api<{ items: Staff[] }>("/settings/staff"),
  });

  const tariffMut = useMutation({
    mutationFn: (values: Partial<Tariff>) =>
      api("/settings/tariffs", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", "tariffs"] });
      setTariffOpen(false);
      tariffForm.resetFields();
    },
  });

  const damageMut = useMutation({
    mutationFn: (values: Partial<DamagePrice>) =>
      api("/settings/damages", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", "damages"] });
      setDamageOpen(false);
      damageForm.resetFields();
    },
  });

  const staffMut = useMutation({
    mutationFn: (values: Partial<Staff>) =>
      api("/settings/staff", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", "staff"] });
      setStaffOpen(false);
      staffForm.resetFields();
    },
  });

  const toggleTariff = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api(`/settings/tariffs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings", "tariffs"] }),
  });

  const resetTotp = useMutation({
    mutationFn: (id: string) =>
      api(`/settings/staff/${id}/reset-totp`, { method: "POST" }),
  });

  const tariffColumns: ColumnsType<Tariff> = [
    { title: "Название", dataIndex: "name" },
    { title: "Модель", dataIndex: "device_model" },
    { title: "Период (ч)", dataIndex: "period_hours", width: 100 },
    { title: "Цена", dataIndex: "price", render: (v: number) => `${v} ₽` },
    {
      title: "Активен",
      dataIndex: "is_active",
      render: (v: boolean, record) => (
        <Switch
          checked={v}
          onChange={(checked) => toggleTariff.mutate({ id: record.id, is_active: checked })}
        />
      ),
    },
  ];

  const damageColumns: ColumnsType<DamagePrice> = [
    { title: "Модель", dataIndex: "device_model" },
    { title: "Категория", dataIndex: "category" },
    { title: "Подкатегория", dataIndex: "subcategory" },
    { title: "Цена", dataIndex: "price", render: (v: number) => `${v} ₽` },
  ];

  const staffColumns: ColumnsType<Staff> = [
    { title: "Email", dataIndex: "email" },
    { title: "ФИО", dataIndex: "full_name" },
    { title: "Роль", dataIndex: "role" },
    {
      title: "Активен",
      dataIndex: "is_active",
      render: (v: boolean) => <Switch checked={v} disabled />,
    },
    {
      title: "Действия",
      render: (_, record) => (
        <Button size="small" onClick={() => resetTotp.mutate(record.id)}>
          Сбросить TOTP
        </Button>
      ),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Настройки
      </Title>

      <Tabs
        items={[
          {
            key: "tariffs",
            label: "Тарифы",
            children: (
              <>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setTariffOpen(true)}
                  style={{ marginBottom: 16 }}
                >
                  Добавить тариф
                </Button>
                <Table
                  loading={tariffsLoading}
                  dataSource={tariffs?.items ?? []}
                  rowKey="id"
                  columns={tariffColumns}
                  pagination={false}
                />
              </>
            ),
          },
          {
            key: "damages",
            label: "Прайс удержаний",
            children: (
              <>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setDamageOpen(true)}
                  style={{ marginBottom: 16 }}
                >
                  Добавить
                </Button>
                <Table
                  loading={damagesLoading}
                  dataSource={damages?.items ?? []}
                  rowKey="id"
                  columns={damageColumns}
                  pagination={false}
                />
              </>
            ),
          },
          {
            key: "params",
            label: "Параметры",
            children: (
              <div style={{ color: "#999" }}>
                Системные параметры (лимиты, таймауты, проценты комиссий) — загружаются из API
              </div>
            ),
          },
          {
            key: "templates",
            label: "Шаблоны уведомлений",
            children: (
              <div style={{ color: "#999" }}>
                Шаблоны SMS/push/email — редактор появится после интеграции notification service
              </div>
            ),
          },
          {
            key: "staff",
            label: "Сотрудники",
            children: (
              <>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setStaffOpen(true)}
                  style={{ marginBottom: 16 }}
                >
                  Добавить
                </Button>
                <Table
                  loading={staffLoading}
                  dataSource={staff?.items ?? []}
                  rowKey="id"
                  columns={staffColumns}
                  pagination={false}
                />
              </>
            ),
          },
        ]}
      />

      {/* Tariff modal */}
      <Modal
        title="Новый тариф"
        open={tariffOpen}
        onCancel={() => setTariffOpen(false)}
        onOk={() => tariffForm.submit()}
      >
        <Form form={tariffForm} layout="vertical" onFinish={(v) => tariffMut.mutate(v)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="device_model" label="Модель" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="period_hours" label="Период (часы)" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="price" label="Цена (₽)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Damage price modal */}
      <Modal
        title="Новая позиция прайса"
        open={damageOpen}
        onCancel={() => setDamageOpen(false)}
        onOk={() => damageForm.submit()}
      >
        <Form form={damageForm} layout="vertical" onFinish={(v) => damageMut.mutate(v)}>
          <Form.Item name="device_model" label="Модель" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subcategory" label="Подкатегория" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Цена (₽)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Staff modal */}
      <Modal
        title="Новый сотрудник"
        open={staffOpen}
        onCancel={() => setStaffOpen(false)}
        onOk={() => staffForm.submit()}
      >
        <Form form={staffForm} layout="vertical" onFinish={(v) => staffMut.mutate(v)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Администратор", value: "admin" },
                { label: "Оператор", value: "operator" },
                { label: "Модератор KYC", value: "kyc_moderator" },
                { label: "Финансист", value: "finance" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
