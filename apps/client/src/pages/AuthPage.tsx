import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Logo, Card, Spinner } from "@deliphone/ui";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";

const TG_BOT = import.meta.env.VITE_TG_BOT_USERNAME || "DeliphoneBot";

export function AuthPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated)();
  const user = useAuthStore((s) => s.user);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scriptAdded = useRef(false);

  // If already logged in — redirect immediately
  useEffect(() => {
    if (isAuth && user) {
      redirectByKycStatus(user.kyc_status);
    }
  }, [isAuth, user]);

  function redirectByKycStatus(status: string) {
    if (status === "approved") navigate("/", { replace: true });
    else if (status === "pending") navigate("/kyc/pending", { replace: true });
    else if (status === "rejected") navigate("/kyc/rejected", { replace: true });
    else navigate("/kyc", { replace: true });
  }

  async function handleTelegramData(tgUser: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const body = { ...tgUser, reg_session_id: sessionId || undefined };
      const res = await api.post<any>("/client/auth/telegram", body);
      setAuth(res);

      if (sessionId) {
        navigate("/auth/reg-success", { replace: true });
        return;
      }
      redirectByKycStatus(res.user.kyc_status);
    } catch (e: any) {
      setError(e.message || "Ошибка авторизации");
      setLoading(false);
    }
  }

  // Handle OAuth redirect callback (?id=...&hash=...)
  useEffect(() => {
    const tgId = searchParams.get("id");
    const tgHash = searchParams.get("hash");
    if (tgId && tgHash) {
      handleTelegramData({
        id: Number(tgId),
        first_name: searchParams.get("first_name") || "",
        last_name: searchParams.get("last_name") || undefined,
        username: searchParams.get("username") || undefined,
        photo_url: searchParams.get("photo_url") || undefined,
        auth_date: Number(searchParams.get("auth_date") || 0),
        hash: tgHash,
      });
    }
  }, []);

  // Load Telegram Login Widget
  useEffect(() => {
    (window as any).onTelegramAuth = (tgUser: any) => handleTelegramData(tgUser);

    if (widgetRef.current && !scriptAdded.current) {
      scriptAdded.current = true;
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", TG_BOT);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "20");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      widgetRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-16">
          <Spinner size={32} />
          <p className="body text-ink-500">Входим...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div
              className="rounded-full bg-accent flex items-center justify-center"
              style={{ width: 48, height: 48 }}
            >
              <MessageCircle size={24} className="text-accent-ink" />
            </div>
            <h1 className="h2 m-0">Войди, чтобы начать</h1>
            <p className="body text-ink-500 m-0">
              Авторизация через Telegram, без SMS и паролей
            </p>

            {/* Telegram Login Widget renders here */}
            <div ref={widgetRef} className="min-h-[44px]" />

            {error && <p className="body-sm text-danger m-0">{error}</p>}

            <details className="w-full">
              <summary className="body-sm text-ink-500 cursor-pointer text-center">
                У меня нет Telegram
              </summary>
              <p className="body-sm text-ink-500 mt-8">
                Регистрация только через Telegram. Если его нет — установи
                бесплатно в{" "}
                <a href="https://apps.apple.com/app/telegram-messenger/id686449807" className="underline">App Store</a>{" "}
                или{" "}
                <a href="https://play.google.com/store/apps/details?id=org.telegram.messenger" className="underline">Google Play</a>.
              </p>
            </details>
          </div>
        </Card>

        {sessionId && (
          <p className="body-sm text-ink-500 text-center">
            Регистрация через партнёрскую точку
          </p>
        )}
      </div>
    </div>
  );
}
