import { useState } from "react";
import {
  Button,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;

type Audit = {
  id: string;
  partner_name: string;
  location_address: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "blue",
  in_progress: "orange",
  completed: "green",
  cancelled: "default",
};

export function AuditsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audits"],
    queryFn: () => api<{ items: Audit[]; total: number }>("/audits"),
  });

  const { data: partners } = useQuery({
    queryKey: ["admin", "partners", "list"],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>("/partners?limit=100"),
  });

  const createMut = useMutation({
    mutationFn: (values: { partner_id: string }) =>
      api("/audits", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "audits"] });
      setCreateOpen(false);
      form.resetFields();
    },
  });

  const columns: ColumnsType<Audit> = [
    { title: "Партнёр", dataIndex: "partner_name", ellipsis: true },
    { title: "Точка", dataIndex: "location_address", ellipsis: true },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Назначена",
      dataIndex: "scheduled_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    {
      title: "Завершена",
      dataIndex: "completed_at",
      render: (d: string | null) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
    },
  ];

  return (
    <>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          Инвентаризации
        </Title>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Новая
        </Button>
      </Space>

      <Table
        loading={isLoading}
        dataSource={data?.items ?? []}
        rowKey="id"
        columns={columns}
        pagination={{ pageSize: 20, total: data?.total }}
      />

      <Modal
        title="Новая инвентаризация"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="Создать"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          <Form.Item name="partner_id" label="Партнёр" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(partners?.items ?? []).map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
