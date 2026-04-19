import { useMemo, useState, type CSSProperties } from "react";
import { Badge, Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@deliphone/ui";
import { colors } from "@deliphone/ui/tokens";
import { NAV } from "@/nav";

const { Header, Sider, Content } = Layout;

/**
 * Admin layout shell — Sider with nav, minimal top bar, content via
 * `<Outlet/>`. Sidebar active state is driven by the real URL via
 * useLocation, so navigating (from anywhere) always keeps the right item
 * highlighted.
 */
export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey =
    NAV.find((n) => n.path === location.pathname)?.key ?? "dashboard";

  const menuItems = useMemo<MenuProps["items"]>(
    () =>
      NAV.map((item) => ({
        key: item.key,
        icon: <item.icon size={16} />,
        label: item.label,
      })),
    [],
  );

  const handleSelect: MenuProps["onClick"] = ({ key }) => {
    const target = NAV.find((n) => n.key === key);
    if (target) navigate(target.path);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={232}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ borderRight: `1px solid ${colors.ink[100]}` }}
      >
        <div
          style={{
            height: 64,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            borderBottom: `1px solid ${colors.ink[100]}`,
          }}
        >
          <Logo size="md" />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleSelect}
          items={menuItems}
          style={{ borderInlineEnd: "none", paddingBlock: 8 }}
        />
      </Sider>

      <Layout>
        <Header style={headerStyle}>
          <span />
          <Badge
            count="v0.1"
            style={{
              backgroundColor: colors.accent.DEFAULT,
              color: colors.accent.ink,
              fontWeight: 600,
            }}
          />
        </Header>
        <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <Outlet />
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
  height: 56,
  lineHeight: "56px",
  borderBottom: `1px solid ${colors.ink[800]}`,
};
