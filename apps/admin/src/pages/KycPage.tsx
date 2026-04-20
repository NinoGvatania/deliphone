import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Image,
  Modal,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type KycEntry = {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
  auto_flags: string[];
  created_at: string;
  assigned_to: string | null;
  passport_photos: string[];
  selfie_url: string | null;
  video_url: string | null;
  data: Record<string, string>;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  resubmit: "blue",
};

export function KycPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selected, setSelected] = useState<KycEntry | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitFiles, setResubmitFiles] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc", status, dateRange, assignedToMe],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (dateRange) {
        params.set("from", dateRange[0]);
        params.set("to", dateRange[1]);
      }
      if (assignedToMe) params.set("assigned_to_me", "true");
      return api<{ items: KycEntry[]; total: number }>(`/kyc?${params}`);
    },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api(`/kyc/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      setSelected(null);
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/kyc/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      setSelected(null);
      setRejectOpen(false);
    },
  });

  const resubmitMut = useMutation({
    mutationFn: ({ id, files }: { id: string; files: string[] }) =>
      api(`/kyc/${id}/resubmit`, { method: "POST", body: JSON.stringify({ files }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      setSelected(null);
      setResubmitOpen(false);
    },
  });

  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      if (!selected) return;
      if (rejectOpen || resubmitOpen) return;
      if (e.key === "a" || e.key === "A") {
        approveMut.mutate(selected.id);
      } else if (e.key === "r" || e.key === "R") {
        setRejectOpen(true);
      } else if (e.key === "s" || e.key === "S") {
        setResubmitOpen(true);
      }
    },
    [selected, rejectOpen, resubmitOpen, approveMut],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  const columns: ColumnsType<KycEntry> = [
    { title: "ФИО", dataIndex: "full_name", ellipsis: true },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Флаги",
      dataIndex: "auto_flags",
      render: (flags: string[]) =>
        flags.map((f) => (
          <Tag key={f} color="volcano">
            {f}
          </Tag>
        )),
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Модерация KYC
      </Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="Статус"
          allowClear
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          options={[
            { label: "Ожидает", value: "pending" },
            { label: "Одобрен", value: "approved" },
            { label: "Отклонён", value: "rejected" },
            { label: "Пересдача", value: "resubmit" },
          ]}
        />
        <RangePicker
          onChange={(_, ds) => setDateRange(ds[0] && ds[1] ? [ds[0], ds[1]] : null)}
        />
        <Switch
          checked={assignedToMe}
          onChange={setAssignedToMe}
          checkedChildren="Мои"
          unCheckedChildren="Все"
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

      <Drawer
        title={selected?.full_name ?? "KYC"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={900}
        extra={
          <Space>
            <Button onClick={() => selected && approveMut.mutate(selected.id)} type="primary">
              [A] Одобрить
            </Button>
            <Button danger onClick={() => setRejectOpen(true)}>
              [R] Отклонить
            </Button>
            <Button onClick={() => setResubmitOpen(true)}>[S] Пересдача</Button>
          </Space>
        }
      >
        {selected && (
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Card title="Паспорт">
              <Image.PreviewGroup>
                <Space>
                  {selected.passport_photos.map((url, i) => (
                    <Image key={i} width={200} src={url} />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Card>

            <Card title="Данные">
              {Object.entries(selected.data).map(([k, v]) => (
                <div key={k}>
                  <Text type="secondary">{k}: </Text>
                  <Text>{v}</Text>
                </div>
              ))}
            </Card>

            {selected.auto_flags.length > 0 && (
              <Card title="Авто-флаги">
                <Space wrap>
                  {selected.auto_flags.map((f) => (
                    <Tag key={f} color="volcano">
                      {f}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selected.selfie_url && (
              <Card title="Селфи">
                <Image width={300} src={selected.selfie_url} />
              </Card>
            )}

            {selected.video_url && (
              <Card title="Видео">
                <video src={selected.video_url} controls style={{ maxWidth: "100%" }} />
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      {/* Reject modal */}
      <Modal
        title="Причина отклонения"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() =>
          selected && rejectMut.mutate({ id: selected.id, reason: rejectReason })
        }
        okText="Отклонить"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Укажите причину..."
        />
      </Modal>

      {/* Resubmit modal */}
      <Modal
        title="Запросить пересдачу"
        open={resubmitOpen}
        onCancel={() => setResubmitOpen(false)}
        onOk={() =>
          selected && resubmitMut.mutate({ id: selected.id, files: resubmitFiles })
        }
        okText="Отправить"
      >
        <Checkbox.Group
          value={resubmitFiles}
          onChange={(v) => setResubmitFiles(v as string[])}
          options={[
            { label: "Фото паспорта (разворот)", value: "passport_main" },
            { label: "Фото прописки", value: "passport_registration" },
            { label: "Селфи с паспортом", value: "selfie" },
            { label: "Видео", value: "video" },
          ]}
        />
      </Modal>
    </>
  );
}
