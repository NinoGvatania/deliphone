import { useMemo, useState } from "react";
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@deliphone/ui";
import { colors } from "@deliphone/ui/tokens";
import { NAV } from "@/nav";
import { isAdminAuthenticated, getAdminUser, clearAdminAuth } from "@/stores/auth";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAdminAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }

  const user = getAdminUser();

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

  function handleLogout() {
    clearAdminAuth();
    window.location.href = "/auth";
  }

  const userMenuItems: MenuProps["items"] = [
    {
      key: "info",
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 600 }}>{user?.full_name}</div>
          <div style={{ fontSize: 12, color: colors.ink[500] }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: colors.ink[400], marginTop: 2 }}>Роль: {user?.role}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogOut size={14} />,
      label: "Выйти",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={232}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ borderRight: `1px solid ${colors.ink[100]}` }}
      >
        <div style={{ height: 64, padding: "0 16px", display: "flex", alignItems: "center", borderBottom: `1px solid ${colors.ink[100]}` }}>
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
        <Header style={{
          background: colors.ink[0],
          borderBottom: `1px solid ${colors.ink[100]}`,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          height: 56,
          lineHeight: "56px",
        }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
            <Button type="text" style={{ display: "flex", alignItems: "center", gap: 8, height: 40 }}>
              <Avatar size={28} style={{ background: colors.ink[900], color: colors.accent.DEFAULT, fontSize: 12, fontWeight: 700 }}>
                {user?.full_name?.[0] ?? "A"}
              </Avatar>
              <Text style={{ maxWidth: 140 }} ellipsis>{user?.full_name ?? "Админ"}</Text>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
