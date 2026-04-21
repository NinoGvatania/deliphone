import { useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Logo } from "@deliphone/ui";
import { isAdminAuthenticated, setAdminAuth } from "@/stores/auth";
import { authFetch } from "@/lib/api";

const { Title, Text } = Typography;

export function AdminAuthPage() {
  const [loading, setLoading] = useState(false);

  // Already logged in
  if (isAdminAuthenticated()) {
    window.location.href = "/dashboard";
    return null;
  }

  async function handleLogin(values: { email: string; password: string }) {
    setLoading(true);
    try {
      // Step 1: email + password → temp_token
      const { temp_token } = await authFetch<{ temp_token: string }>("/auth/login", values);

      // Step 2: dev bypass (skip TOTP in dev)
      const data = await authFetch<{ access_token: string; user: any }>("/auth/dev-bypass", { temp_token });

      // Save and redirect
      setAdminAuth(data.access_token, data.user);
      window.location.href = "/dashboard";
    } catch (e: any) {
      message.error(e.message || "Неверные данные");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F6" }}>
      <Card style={{ width: 420, borderRadius: 20, boxShadow: "0 4px 24px rgba(15,15,14,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size="lg" />
          <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>Админ-панель</Title>
          <Text type="secondary">Войдите чтобы продолжить</Text>
        </div>

        <Form onFinish={handleLogin} layout="vertical" size="large" autoComplete="on">
          <Form.Item name="email" rules={[{ required: true, type: "email", message: "Введите email" }]}>
            <Input prefix={<MailOutlined />} placeholder="admin@deliphone.dev" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "Введите пароль" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48, borderRadius: 999, fontSize: 16 }}>
              Войти
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            admin@deliphone.dev / admin123
          </Text>
        </div>
      </Card>
    </div>
  );
}
