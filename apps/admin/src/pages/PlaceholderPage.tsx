import { Empty, Typography } from "antd";
import { useLocation } from "react-router-dom";
import { NAV } from "@/nav";

const { Title, Paragraph } = Typography;

/**
 * Fallback page for navigation items whose real screen isn't built yet.
 * Reads the route from the URL so the heading matches the sidebar label.
 */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const item = NAV.find((n) => n.path === pathname);
  const label = item?.label ?? "Раздел";

  return (
    <>
      <Title level={2} style={{ marginTop: 8 }}>
        {label}
      </Title>
      <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 640 }}>
        Этот раздел появится в одной из следующих фаз (см. SPEC.md §19).
      </Paragraph>
      <Empty description={`Пока здесь пусто — ${label.toLowerCase()}`} />
    </>
  );
}
