import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import { AlertOctagon, Smartphone, UserCheck, Wallet } from "lucide-react";
import { colors } from "@deliphone/ui/tokens";

const { Title, Paragraph, Text } = Typography;

/** Static placeholder timestamp — wired to a real feed in later phases. */
const lastUpdated = "сегодня, 14:30";

export function DashboardPage() {
  return (
    <>
      <Space direction="vertical" size={4} style={{ display: "flex" }}>
        <Title level={1} style={{ marginTop: 0, marginBottom: 0 }}>
          Дашборд
        </Title>
        <Paragraph
          type="secondary"
          style={{ fontSize: 16, maxWidth: 640, marginBottom: 0 }}
        >
          Обзор операций и финансов на сегодня.
        </Paragraph>
        <Text style={{ color: colors.ink[500], fontSize: 13 }}>
          Обновлено: {lastUpdated}
        </Text>
      </Space>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Активных аренд" value={0} prefix={<Smartphone size={16} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="KYC в очереди" value={0} prefix={<UserCheck size={16} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Инцидентов" value={0} prefix={<AlertOctagon size={16} />} />
          </Card>
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
    </>
  );
}
