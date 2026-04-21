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
  const [step, setStep] = useState<"login" | "totp">("login");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: { email: string; password: string }) {
    setLoading(true);
    try {
      const res = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });
      setTempToken(res.temp_token);
      setStep("totp");
    } catch (e: any) {
      message.error(e.message || "Неверные данные");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(values: { totp_code: string }) {
    setLoading(true);
    try {
      const res = await api<any>("/auth/verify-2fa", {
        method: "POST",
        body: JSON.stringify({ temp_token: tempToken, totp_code: values.totp_code }),
        headers: { "Content-Type": "application/json" },
      });
      auth.setAuth(res.access_token, res.user);
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (e: any) {
      message.error(e.message || "Неверный код");
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
          <Text type="secondary">{step === "login" ? "Вход по email и паролю" : "Введите код из authenticator"}</Text>
        </div>

        {step === "login" ? (
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
        ) : (
          <Form onFinish={handleTotp} layout="vertical" size="large">
            <Form.Item name="totp_code" rules={[{ required: true, message: "Введите 6-значный код" }]}>
              <Input prefix={<SafetyOutlined />} placeholder="000000" maxLength={6} style={{ textAlign: "center", letterSpacing: 8 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ borderRadius: 999, height: 44 }}>
              Подтвердить
            </Button>
            <Button type="link" block onClick={() => setStep("login")} style={{ marginTop: 8 }}>
              Назад
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
