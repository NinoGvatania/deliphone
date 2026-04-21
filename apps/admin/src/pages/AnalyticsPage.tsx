import { Card, Tabs, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors } from "@deliphone/ui/tokens";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

type CohortRow = {
  cohort: string;
  months: number[];
};

type UtilizationItem = {
  device: string;
  utilization: number;
};

type PartnerRank = {
  name: string;
  revenue: number;
};

type ProfitItem = {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
};

type LtvItem = {
  date: string;
  ltv: number;
  cac: number;
};

export function AnalyticsPage() {
  const { data: cohorts } = useQuery({
    queryKey: ["admin", "analytics", "cohorts"],
    queryFn: () => api<{ rows: CohortRow[] }>("/analytics/cohorts"),
  });

  const { data: utilization } = useQuery({
    queryKey: ["admin", "analytics", "utilization"],
    queryFn: () => api<{ items: UtilizationItem[] }>("/analytics/utilization"),
  });

  const { data: partnerRank } = useQuery({
    queryKey: ["admin", "analytics", "partner-ranking"],
    queryFn: () => api<{ items: PartnerRank[] }>("/analytics/partner-ranking"),
  });

  const { data: profitability } = useQuery({
    queryKey: ["admin", "analytics", "profitability"],
    queryFn: () => api<{ items: ProfitItem[] }>("/analytics/profitability"),
  });

  const { data: ltv } = useQuery({
    queryKey: ["admin", "analytics", "ltv"],
    queryFn: () => api<{ items: LtvItem[] }>("/analytics/ltv"),
  });

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Аналитика
      </Title>

      <Tabs
        items={[
          {
            key: "cohorts",
            label: "Когорты",
            children: (
              <Card>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "4px 8px", textAlign: "left" }}>Когорта</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} style={{ padding: "4px 8px" }}>
                            M{i}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(cohorts?.rows ?? []).map((row) => (
                        <tr key={row.cohort}>
                          <td style={{ padding: "4px 8px", fontWeight: 500 }}>{row.cohort}</td>
                          {row.months.map((v, i) => (
                            <td
                              key={i}
                              style={{
                                padding: "4px 8px",
                                textAlign: "center",
                                backgroundColor: `rgba(205, 220, 57, ${v / 100})`,
                              }}
                            >
                              {v}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ),
          },
          {
            key: "utilization",
            label: "Утилизация",
            children: (
              <Card>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={utilization?.items ?? []}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="device" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="utilization" fill={colors.accent.DEFAULT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ),
          },
          {
            key: "partners",
            label: "Рейтинг партнёров",
            children: (
              <Card>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={partnerRank?.items ?? []}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill={colors.accent.DEFAULT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ),
          },
          {
            key: "profitability",
            label: "Прибыльность",
            children: (
              <Card>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={profitability?.items ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke={colors.accent.DEFAULT}
                      fill={colors.accent.soft}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stackId="2"
                      stroke="#ff4d4f"
                      fill="rgba(255,77,79,0.2)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stackId="3"
                      stroke="#52c41a"
                      fill="rgba(82,196,26,0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            ),
          },
          {
            key: "ltv",
            label: "LTV / CAC",
            children: (
              <Card>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={ltv?.items ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ltv"
                      stroke={colors.accent.DEFAULT}
                      strokeWidth={2}
                      dot={false}
                      name="LTV"
                    />
                    <Line
                      type="monotone"
                      dataKey="cac"
                      stroke="#ff4d4f"
                      strokeWidth={2}
                      dot={false}
                      name="CAC"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
