import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { LockOutlined, MailOutlined, SafetyOutlined } from "@ant-design/icons";
import { Logo } from "@deliphone/ui";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

type AuthStore = {
  token: string | null;
  user: any;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

// Simple auth store for admin (localStorage)
const STORAGE_KEY = "deliphone-admin-auth";

function getStored(): { token: string; user: any } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useAdminAuth(): AuthStore {
  const stored = getStored();
  return {
    token: stored?.token ?? null,
    user: stored?.user ?? null,
    setAuth: (token, user) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      // Set token for API client
      (window as any).__admin_token = token;
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEY);
      (window as any).__admin_token = null;
    },
    isAuthenticated: () => !!getStored()?.token,
  };
}

export function AdminAuthPage() {
  const navigate = useNavigate();
  const auth = useAdminAuth();
  const [step] = useState<"login">("login");
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: { email: string; password: string }) {
    setLoading(true);
    try {
      // Step 1: login → get temp_token
      const res1 = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });
      // Step 2: auto-verify TOTP via dev bypass
      const res2 = await api<any>("/auth/dev-bypass", {
        method: "POST",
        body: JSON.stringify({ temp_token: res1.temp_token }),
        headers: { "Content-Type": "application/json" },
      });
      auth.setAuth(res2.access_token, res2.user);
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (e: any) {
      message.error(e.message || "Неверные данные");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F6" }}>
      <Card style={{ width: 400, borderRadius: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Logo size="lg" />
          <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>Админ-панель</Title>
          <Text type="secondary">Вход по email и паролю</Text>
        </div>

        <Form onFinish={handleLogin} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: "Введите email" }]}>
            <Input prefix={<MailOutlined />} placeholder="admin@deliphone.dev" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "Введите пароль" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} style={{ borderRadius: 999, height: 44 }}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
}
