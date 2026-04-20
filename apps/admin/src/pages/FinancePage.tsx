import { useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  user_name: string | null;
  created_at: string;
};

type Debt = {
  id: string;
  user_name: string;
  amount: number;
  days_overdue: number;
  rental_id: string;
};

type Payout = {
  id: string;
  partner_name: string;
  amount: number;
  status: string;
  created_at: string;
};

type FinanceOverview = {
  total_revenue: number;
  total_expenses: number;
  total_profit: number;
};

const TX_COLORS: Record<string, string> = {
  income: "green",
  expense: "red",
  refund: "orange",
  payout: "blue",
};

export function FinancePage() {
  const [txPage, setTxPage] = useState(1);
  const [txType, setTxType] = useState<string | undefined>();

  const { data: overview } = useQuery({
    queryKey: ["admin", "finance", "overview"],
    queryFn: () => api<FinanceOverview>("/finance/overview"),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["admin", "finance", "transactions", txPage, txType],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(txPage), limit: "20" });
      if (txType) params.set("type", txType);
      return api<{ items: Transaction[]; total: number }>(`/finance/transactions?${params}`);
    },
  });

  const { data: debts } = useQuery({
    queryKey: ["admin", "finance", "debts"],
    queryFn: () => api<{ items: Debt[] }>("/finance/debts"),
  });

  const { data: payouts } = useQuery({
    queryKey: ["admin", "finance", "payouts"],
    queryFn: () => api<{ items: Payout[] }>("/finance/payouts"),
  });

  const txColumns: ColumnsType<Transaction> = [
    {
      title: "Тип",
      dataIndex: "type",
      render: (s: string) => <Tag color={TX_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
    },
    { title: "Описание", dataIndex: "description", ellipsis: true },
    { title: "Клиент", dataIndex: "user_name", render: (v) => v ?? "—" },
    {
      title: "Дата",
      dataIndex: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Финансы
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Выручка"
              value={overview?.total_revenue ?? 0}
              suffix="₽"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Расходы"
              value={overview?.total_expenses ?? 0}
              suffix="₽"
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Прибыль" value={overview?.total_profit ?? 0} suffix="₽" />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: "transactions",
            label: "Транзакции",
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Select
                    placeholder="Тип"
                    allowClear
                    style={{ width: 140 }}
                    value={txType}
                    onChange={setTxType}
                    options={[
                      { label: "Доход", value: "income" },
                      { label: "Расход", value: "expense" },
                      { label: "Возврат", value: "refund" },
                      { label: "Выплата", value: "payout" },
                    ]}
                  />
                </Space>
                <Table
                  loading={txLoading}
                  dataSource={transactions?.items ?? []}
                  rowKey="id"
                  columns={txColumns}
                  pagination={{
                    current: txPage,
                    pageSize: 20,
                    total: transactions?.total,
                    onChange: setTxPage,
                  }}
                />
              </>
            ),
          },
          {
            key: "debts",
            label: "Долги",
            children: (
              <Table
                dataSource={debts?.items ?? []}
                rowKey="id"
                columns={[
                  { title: "Клиент", dataIndex: "user_name" },
                  {
                    title: "Сумма",
                    dataIndex: "amount",
                    render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
                  },
                  { title: "Просрочка", dataIndex: "days_overdue", render: (v: number) => `${v} дн.` },
                ]}
              />
            ),
          },
          {
            key: "payouts",
            label: "Выплаты партнёрам",
            children: (
              <Table
                dataSource={payouts?.items ?? []}
                rowKey="id"
                columns={[
                  { title: "Партнёр", dataIndex: "partner_name" },
                  {
                    title: "Сумма",
                    dataIndex: "amount",
                    render: (v: number) => `${v.toLocaleString("ru-RU")} ₽`,
                  },
                  {
                    title: "Статус",
                    dataIndex: "status",
                    render: (s: string) => <Tag>{s}</Tag>,
                  },
                  {
                    title: "Дата",
                    dataIndex: "created_at",
                    render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </>
  );
}
