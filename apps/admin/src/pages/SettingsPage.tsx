import { Card, Descriptions, Typography } from "antd";
import { brand } from "@deliphone/ui/tokens";

const { Title, Paragraph } = Typography;

/**
 * /settings — placeholder. For now surfaces the build/version info that
 * used to live in the top bar. Real admin settings (tariffs, damage
 * pricing, templates, parameters — SPEC §7.11) land in a later phase.
 */
export function SettingsPage() {
  return (
    <>
      <Title level={1} style={{ marginTop: 0 }}>
        Настройки
      </Title>
      <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 640 }}>
        Системные параметры, тарифы, прайс удержаний и шаблоны уведомлений
        появятся здесь в следующих фазах (SPEC §7.11).
      </Paragraph>

      <Card title="О системе" style={{ maxWidth: 640 }}>
        <Descriptions column={1} size="middle">
          <Descriptions.Item label="Продукт">{brand.name}</Descriptions.Item>
          <Descriptions.Item label="Версия">0.1</Descriptions.Item>
          <Descriptions.Item label="Окружение">local</Descriptions.Item>
          <Descriptions.Item label="Документация">docs/SPEC.md</Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );
}
