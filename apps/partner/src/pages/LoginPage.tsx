import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Logo } from "@deliphone/ui";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated()) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; refresh_token: string; user: any }>(
        "/partner/auth/login",
        { email, password },
      );
      setAuth(res);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-ink-50 p-24">
      <Card variant="outlined" padding={32} className="w-full max-w-[420px]">
        <div className="flex justify-center mb-24">
          <Logo size="lg" />
        </div>

        <h1 className="h2 text-ink-900 text-center mb-24">Вход для партнёров</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-16">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="body-sm text-danger text-center">{error}</div>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Войти
          </Button>
        </form>
      </Card>
    </div>
  );
}
