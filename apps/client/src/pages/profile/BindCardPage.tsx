import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader, Button, Card, Logo, Spinner } from "@deliphone/ui";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import { paymentsApi } from "@/api/payments";

/**
 * Card binding page. Two modes:
 * 1. /profile/bind-card — normal client flow
 * 2. /c/:token — partner QR flow (token is visual only, auth via Telegram)
 */
export function BindCardPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();
  const [stage, setStage] = useState<"init" | "widget" | "success" | "error">("init");
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const isPartnerFlow = !!token;

  useEffect(() => {
    initWidget();
  }, []);

  async function initWidget() {
    try {
      const { confirmation_token } = await paymentsApi.initMethod();
      setStage("widget");

      // Wait for DOM
      requestAnimationFrame(() => {
        if (widgetRef.current && (window as any).YooMoneyCheckoutWidget) {
          const checkout = new (window as any).YooMoneyCheckoutWidget({
            confirmation_token,
            return_url: window.location.origin + "/profile/bind-card/success",
            customization: {
              colors: { control_primary: "#D6FF3D" },
            },
            error_callback: () => setError("Ошибка при привязке карты"),
          });
          checkout.render("yoomoney-widget-container");
        } else {
          // Widget JS not loaded — show fallback
          setError("Виджет ЮKassa не загрузился. Попробуй обновить страницу.");
        }
      });
    } catch (e: any) {
      setError(e.message || "Ошибка инициализации");
      setStage("error");
    }
  }

  if (stage === "success") {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col">
        <AppHeader left={<Logo size="sm" />} />
        <main className="flex-1 flex items-center justify-center px-16">
          <Card variant="elevated" padding={32}>
            <div className="flex flex-col items-center gap-16 text-center">
              <div className="w-48 h-48 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle size={24} className="text-success" />
              </div>
              <h2 className="h2 m-0">Карта привязана</h2>
              <p className="body text-ink-500 m-0">
                {isPartnerFlow
                  ? "Готово, передай телефон оператору"
                  : "Теперь можно бронировать устройства"}
              </p>
              {!isPartnerFlow && (
                <Button variant="primary" size="lg" fullWidth onClick={() => navigate("/")}>
                  На главную
                </Button>
              )}
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader
        left={
          isPartnerFlow ? <Logo size="sm" /> : (
            <button onClick={() => navigate(-1)} className="p-4">
              <ArrowLeft size={20} />
            </button>
          )
        }
      />
      <main className="flex-1 px-16 py-24 max-w-[480px] mx-auto w-full">
        {stage === "init" && (
          <div className="flex flex-col items-center gap-16">
            <Spinner size={32} />
            <p className="body text-ink-500">Подготавливаем форму привязки...</p>
          </div>
        )}

        {stage === "widget" && (
          <div className="flex flex-col gap-16">
            <div className="flex items-center gap-12">
              <div className="w-40 h-40 rounded-full bg-ink-100 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h1 className="h2 m-0">Привяжи карту</h1>
                <p className="body-sm text-ink-500 m-0">
                  Для автоматических списаний за аренду
                </p>
              </div>
            </div>

            <div id="yoomoney-widget-container" ref={widgetRef} className="min-h-[200px]" />

            <p className="caption text-ink-400 text-center">
              Данные карты защищены стандартом PCI DSS. Мы не храним номер карты.
            </p>
          </div>
        )}

        {error && (
          <Card variant="outlined" padding={20}>
            <p className="body text-danger m-0">{error}</p>
            <Button variant="ghost" size="md" onClick={initWidget} className="mt-12">
              Попробовать снова
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
