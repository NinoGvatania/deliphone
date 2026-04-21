import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Spinner } from "@deliphone/ui";
import { CheckCircle, CreditCard, Smartphone } from "lucide-react";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

type RentalDetails = {
  device_model: string;
  location_name: string;
  deposit_amount: number;
  daily_rate: number;
  payment_url?: string;
};

type PaymentStatus = "idle" | "loading" | "paying" | "success" | "error";

export function ActivationPayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const isAuth = useAuthStore((s) => s.isAuthenticated)();

  const [details, setDetails] = useState<RentalDetails | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isAuth) {
      navigate(`/auth?redirect=${encodeURIComponent(`/activate/pay?token=${token}`)}`, { replace: true });
    }
  }, [isAuth, navigate, token]);

  // Fetch rental details from token
  useEffect(() => {
    if (!token || !isAuth) return;

    async function fetchDetails() {
      try {
        const res = await api.get<RentalDetails>(`/client/activation/${token}`);
        setDetails(res);
        setStatus("idle");
      } catch (e: any) {
        setError(e.message || "Не удалось загрузить данные аренды");
        setStatus("error");
      }
    }

    fetchDetails();
  }, [token, isAuth]);

  async function handlePay() {
    if (!token) return;
    setStatus("paying");
    setError(null);

    try {
      const res = await api.post<{ payment_url: string; rental_id: string }>(
        "/client/activation/pay",
        { token },
      );

      if (res.payment_url) {
        // Redirect to YooKassa payment page
        window.location.href = res.payment_url;
      } else {
        // Payment completed immediately (e.g. saved card)
        setStatus("success");
      }
    } catch (e: any) {
      setError(e.message || "Ошибка оплаты");
      setStatus("idle");
    }
  }

  // Check for payment completion callback
  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    if (paymentStatus === "success") {
      setStatus("success");
    } else if (paymentStatus === "fail") {
      setError("Оплата не прошла. Попробуй ещё раз.");
      setStatus("idle");
    }
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-16">
          <Spinner size={32} />
          <p className="body text-ink-500">Загружаем данные...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-20">
        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-20 text-center">
            <CheckCircle size={64} className="text-accent" />
            <h1 className="h2 m-0">Устройство активировано!</h1>
            <p className="body text-ink-500 m-0">
              Оплата прошла успешно. Устройство готово к использованию.
            </p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full px-16 py-12 rounded-full bg-accent text-accent-ink body font-semibold"
            >
              На главную
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-20">
      <div className="w-full max-w-[420px]">
        <Card variant="elevated" padding={32}>
          <div className="flex flex-col gap-20">
            <div className="flex items-center gap-12">
              <div className="w-48 h-48 rounded-full bg-accent/10 flex items-center justify-center">
                <Smartphone size={24} className="text-accent" />
              </div>
              <div>
                <h2 className="h3 m-0">{details?.device_model ?? "Устройство"}</h2>
                <p className="body-sm text-ink-500 m-0">{details?.location_name}</p>
              </div>
            </div>

            <div className="border-t border-ink-100 pt-16 flex flex-col gap-12">
              <div className="flex justify-between">
                <span className="body text-ink-500">Залог</span>
                <span className="body font-semibold text-ink-900">
                  {details?.deposit_amount?.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <div className="flex justify-between">
                <span className="body text-ink-500">Ежедневная оплата</span>
                <span className="body font-semibold text-ink-900">
                  {details?.daily_rate?.toLocaleString("ru-RU")} ₽/день
                </span>
              </div>
            </div>

            {error && <p className="body-sm text-danger m-0">{error}</p>}

            <button
              onClick={handlePay}
              disabled={status === "paying"}
              className="w-full px-16 py-14 rounded-full bg-accent text-accent-ink body font-semibold flex items-center justify-center gap-8 transition-opacity disabled:opacity-50"
            >
              {status === "paying" ? (
                <Spinner size={18} />
              ) : (
                <CreditCard size={18} />
              )}
              {status === "paying" ? "Обработка..." : "Оплатить"}
            </button>

            <p className="body-sm text-ink-400 text-center m-0">
              Залог блокируется на карте и возвращается при возврате устройства
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
