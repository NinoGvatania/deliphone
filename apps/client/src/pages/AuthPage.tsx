import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Logo, Card } from "@deliphone/ui";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";

const TG_BOT = import.meta.env.VITE_TG_BOT_USERNAME || "DeliphoneBot";

export function AuthPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global callback for the Telegram Login Widget
    (window as any).onTelegramAuth = async (tgUser: any) => {
      try {
        const body = { ...tgUser, reg_session_id: sessionId || undefined };
        const res = await api.post<any>("/client/auth/telegram", body);
        setAuth(res);

        if (sessionId) {
          navigate("/auth/reg-success");
          return;
        }

        const { user } = res;
        if (user.kyc_status === "approved") navigate("/");
        else if (user.kyc_status === "pending") navigate("/kyc/pending");
        else if (user.kyc_status === "rejected") navigate("/kyc/rejected");
        else navigate("/kyc");
      } catch (e) {
        console.error("Telegram auth failed:", e);
      }
    };

    if (widgetRef.current) {
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
  }, [navigate, sessionId, setAuth]);

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div className="w-48 h-48 rounded-full bg-accent flex items-center justify-center">
              <MessageCircle size={24} className="text-accent-ink" />
            </div>
            <h1 className="h2 m-0">Войди, чтобы начать</h1>
            <p className="body text-ink-500 m-0">
              Авторизация через Telegram, без SMS и паролей
            </p>

            <div ref={widgetRef} className="min-h-[44px]" />

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
