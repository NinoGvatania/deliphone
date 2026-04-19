import { Card, Col, Row, Statistic, Typography } from "antd";
import { AlertOctagon, Smartphone, UserCheck, Wallet } from "lucide-react";
import { brand } from "@deliphone/ui/tokens";

const { Title, Paragraph } = Typography;

export function DashboardPage() {
  return (
    <>
      <Title level={2} style={{ marginTop: 8 }}>
        Дашборд · заглушка
      </Title>
      <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 640 }}>
        {brand.tagline} Админ-панель для KYC, инцидентов, партнёров, финансов и
        логистики — см. SPEC.md §7.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
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
