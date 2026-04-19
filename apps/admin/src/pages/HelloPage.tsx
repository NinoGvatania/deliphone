import { Button, Layout, Space, Tag, Typography } from "antd";
import { DelifonTokens } from "@deliphone/shared-types/tokens";

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

export function HelloPage() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingInline: 32,
        }}
      >
        <span
          style={{
            color: DelifonTokens.color.accent.DEFAULT,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontSize: 22,
          }}
        >
          Делифон · Admin
        </span>
        <Tag color={DelifonTokens.color.accent.DEFAULT} style={{ color: DelifonTokens.color.accent.ink, margin: 0 }}>
          v0.1
        </Tag>
      </Header>
      <Content style={{ padding: 40, maxWidth: 960, margin: "40px auto" }}>
        <Title level={1} style={{ marginTop: 0, letterSpacing: "-0.02em" }}>
          Hello Deliphone admin
        </Title>
        <Paragraph style={{ fontSize: 17, color: DelifonTokens.color.ink[500] }}>
          {DelifonTokens.brand.tagline} Админ-панель для KYC, инцидентов, партнёров и финансов — см. SPEC.md §7.
        </Paragraph>
        <Space size={12}>
          <Button type="primary" size="large">
            Открыть дашборд
          </Button>
          <Button size="large">Очередь KYC</Button>
          <Button size="large">Партнёры</Button>
        </Space>
      </Content>
    </Layout>
  );
}
