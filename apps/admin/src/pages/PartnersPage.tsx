import { useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title } = Typography;

type Partner = {
  id: string;
  name: string;
  inn: string;
  locations_count: number;
  devices_count: number;
  balance: number;
  rating: number;
  status: string;
  revenue_breakdown: { label: string; amount: number }[];
  payouts: { id: string; amount: number; date: string; status: string }[];
  attracted_clients: {
    id: string;
    name: string;
    kyc_status: string;
    first_rental: string;
    bonus: number;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  active: "green",
  suspended: "orange",
  blocked: "red",
};

export function PartnersPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Partner | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: () => api<{ items: Partner[]; total: number }>("/partners"),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: unknown }) =>
      api(`/partners/${id}/${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partners"] }),
  });

  const columns: ColumnsType<Partner> = [
    { title: "Название", dataIndex: "name", ellipsis: true },
    { title: "ИНН", dataIndex: "inn", width: 130 },
    { title: "Точки", dataIndex: "locations_count", width: 70 },
    { title: "Устройства", dataIndex: "devices_count", width: 100 },
    {
      title: "Баланс",
      dataIndex: "balance",
      render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
    },
    {
      title: "Рейтинг",
      dataIndex: "rating",
      render: (v: number) => v.toFixed(1),
      width: 80,
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Партнёры
      </Title>

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
        title={selected?.name ?? "Партнёр"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={800}
        extra={
          <Space>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "suspend" })
              }
            >
              Заморозить
            </Button>
            <Button
              danger
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "block" })
              }
            >
              Заблокировать
            </Button>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "audit" })
              }
            >
              Инвентаризация
            </Button>
            <Button
              onClick={() =>
                selected && actionMut.mutate({ id: selected.id, action: "payout" })
              }
            >
              Выплата
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>Корректировка</Button>
          </Space>
        }
      >
        {selected && (
          <Tabs
            items={[
              {
                key: "overview",
                label: "Обзор",
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="ИНН">{selected.inn}</Descriptions.Item>
                    <Descriptions.Item label="Статус">
                      <Tag color={STATUS_COLORS[selected.status]}>{selected.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Точки">
                      {selected.locations_count}
                    </Descriptions.Item>
                    <Descriptions.Item label="Устройства">
                      {selected.devices_count}
                    </Descriptions.Item>
                    <Descriptions.Item label="Рейтинг">
                      {selected.rating.toFixed(1)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Баланс">
                      {selected.balance.toLocaleString("ru-RU")} ₽
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: "finance",
                label: "Финансы",
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Statistic
                      title="Баланс"
                      value={selected.balance}
                      suffix="₽"
                    />
                    <Table
                      size="small"
                      dataSource={selected.revenue_breakdown}
                      rowKey="label"
                      pagination={false}
                      columns={[
                        { title: "Статья", dataIndex: "label" },
                        {
                          title: "Сумма",
                          dataIndex: "amount",
                          render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
                        },
                      ]}
                    />
                    <Table
                      size="small"
                      dataSource={selected.payouts}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        {
                          title: "Сумма",
                          dataIndex: "amount",
                          render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
                        },
                        { title: "Дата", dataIndex: "date" },
                        { title: "Статус", dataIndex: "status" },
                      ]}
                    />
                  </Space>
                ),
              },
              {
                key: "clients",
                label: "Привлечённые",
                children: (
                  <Table
                    size="small"
                    dataSource={selected.attracted_clients}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: "Клиент", dataIndex: "name" },
                      {
                        title: "KYC",
                        dataIndex: "kyc_status",
                        render: (s: string) => <Tag>{s}</Tag>,
                      },
                      { title: "Первая аренда", dataIndex: "first_rental" },
                      {
                        title: "Бонус",
                        dataIndex: "bonus",
                        render: (v: number) => `${v} ₽`,
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* Adjustment modal */}
      <Modal
        title="Корректировка баланса"
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={() => adjustForm.submit()}
        okText="Применить"
      >
        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={(v) => {
            if (selected) {
              actionMut.mutate({ id: selected.id, action: "adjust", body: v });
            }
            setAdjustOpen(false);
          }}
        >
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Бонус", value: "bonus" },
                { label: "Штраф", value: "penalty" },
              ]}
            />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} suffix="₽" />
          </Form.Item>
          <Form.Item name="reason" label="Причина">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
