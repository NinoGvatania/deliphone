import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader, Button, Card, Badge } from "@deliphone/ui";
import { ArrowLeft, Check, Shield, Clock, Headphones } from "lucide-react";
import { paymentsApi } from "@/api/payments";

const BENEFITS = [
  { icon: Shield, text: "Залог 1 500 ₽ вместо 4 500 ₽" },
  { icon: Headphones, text: "Приоритет в чате поддержки (ответ до 15 мин)" },
  { icon: Clock, text: "Резерв замещающего устройства при малфанкции" },
];

export function SubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => paymentsApi.getSubscription(),
  });

  const createMut = useMutation({
    mutationFn: () => paymentsApi.createSubscription(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });

  const cancelMut = useMutation({
    mutationFn: () => paymentsApi.cancelSubscription(),
    onSuccess: () => {
      setShowCancel(false);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const isActive = subscription?.status === "active";
  const isCancelled = subscription?.status === "cancelled";

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader
        left={
          <button onClick={() => navigate(-1)} className="p-4">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <main className="flex-1 px-16 py-24 max-w-[480px] mx-auto w-full">
        <div className="flex items-center gap-8 mb-16">
          <h1 className="h1 m-0">Подписка «Удобно»</h1>
          {isActive && <Badge variant="accent" size="sm">Активна</Badge>}
          {isCancelled && <Badge variant="neutral" size="sm">Отменена</Badge>}
        </div>

        {/* Benefits */}
        <Card variant="elevated" padding={24}>
          <div className="flex flex-col gap-16">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-start gap-12">
                <div className="w-32 h-32 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                  <b.icon size={16} />
                </div>
                <p className="body m-0">{b.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Action area */}
        <div className="mt-24">
          {!isActive && !isCancelled && (
            <>
              <Card variant="filled" padding={20}>
                <div className="flex justify-between items-center">
                  <span className="body text-ink-500">Стоимость</span>
                  <span className="h2 m-0">199 ₽/мес</span>
                </div>
                <p className="caption text-ink-400 mt-8 m-0">
                  Автосписание каждые 30 дней. Отмена в любой момент.
                </p>
              </Card>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={createMut.isPending}
                onClick={() => createMut.mutate()}
                className="mt-16"
              >
                Оформить за 199 ₽/мес
              </Button>
            </>
          )}

          {isActive && subscription && (
            <Card variant="outlined" padding={20}>
              <div className="flex flex-col gap-8">
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Следующее списание</span>
                  <span className="body-sm font-semibold">
                    {subscription.next_charge_at
                      ? new Date(subscription.next_charge_at).toLocaleDateString("ru-RU")
                      : "—"}
                  </span>
                </div>
                <button
                  onClick={() => setShowCancel(true)}
                  className="body-sm text-danger underline text-left mt-8"
                >
                  Отменить подписку
                </button>
              </div>
            </Card>
          )}

          {isCancelled && subscription?.ends_at && (
            <Card variant="outlined" padding={20}>
              <p className="body text-ink-500 m-0">
                Подписка действует до{" "}
                <strong>{new Date(subscription.ends_at).toLocaleDateString("ru-RU")}</strong>.
                После этого залог вернётся к 4 500 ₽.
              </p>
            </Card>
          )}
        </div>

        {/* Cancel confirmation modal */}
        {showCancel && (
          <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-end justify-center">
            <Card variant="elevated" padding={24} style={{ borderRadius: "36px 36px 0 0", width: "100%", maxWidth: 480 }}>
              <h3 className="h3 m-0">Отменить подписку?</h3>
              <p className="body text-ink-500 mt-8 m-0">
                Подписка будет действовать до конца оплаченного периода.
                Следующая аренда потребует полный залог 4 500 ₽.
              </p>
              <div className="flex gap-12 mt-20">
                <Button variant="ghost" size="md" fullWidth onClick={() => setShowCancel(false)}>
                  Не отменять
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  fullWidth
                  loading={cancelMut.isPending}
                  onClick={() => cancelMut.mutate()}
                >
                  Отменить
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
