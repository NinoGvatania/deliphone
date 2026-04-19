import { useMemo, useState, type CSSProperties } from "react";
import { Badge, Button, Card, Col, Layout, Menu, Row, Space, Statistic, Typography } from "antd";
import type { MenuProps } from "antd";
import { AlertOctagon, Smartphone, UserCheck, Wallet } from "lucide-react";
import { brand, colors } from "@deliphone/ui/tokens";
import { NAV } from "@/nav";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph } = Typography;

export function HelloPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<string>(NAV[0]?.key ?? "dashboard");

  const menuItems = useMemo<MenuProps["items"]>(
    () =>
      NAV.map((item) => ({
        key: item.key,
        icon: <item.icon size={16} />,
        label: item.label,
      })),
    [],
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={232}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ borderRight: `1px solid ${colors.ink[100]}` }}
      >
        <BrandMark collapsed={collapsed} />
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          onSelect={(e) => setSelected(e.key)}
          items={menuItems}
          style={{ borderInlineEnd: "none" }}
        />
      </Sider>

      <Layout>
        <Header style={headerStyle}>
          <Space size={12} align="center">
            <Title level={4} style={{ margin: 0, color: colors.ink[0] }}>
              Hello Deliphone admin
            </Title>
            <Badge
              count="v0.1"
              style={{
                backgroundColor: colors.accent.DEFAULT,
                color: colors.accent.ink,
                fontWeight: 600,
              }}
            />
          </Space>
          <Button type="primary">Открыть дашборд</Button>
        </Header>

        <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <Title level={2} style={{ marginTop: 8 }}>
            Дашборд · заглушка
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 640 }}>
            {brand.tagline} Админ-панель для KYC, инцидентов, партнёров, финансов и логистики —
            см. SPEC.md §7.
          </Paragraph>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Активных аренд" value={0} prefix={<Smartphone size={16} />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="KYC в очереди" value={0} prefix={<UserCheck size={16} />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Инцидентов" value={0} prefix={<AlertOctagon size={16} />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Выручка сегодня"
                  value={0}
                  prefix={<Wallet size={16} />}
                  suffix="₽"
                />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingInline: 24,
  borderBottom: `1px solid ${colors.ink[800]}`,
};

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        height: 64,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: `1px solid ${colors.ink[100]}`,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: colors.accent.DEFAULT,
          color: colors.accent.ink,
          fontWeight: 700,
          fontSize: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        Д
      </span>
      {!collapsed && (
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>
          {brand.name}
        </span>
      )}
    </div>
  );
}
