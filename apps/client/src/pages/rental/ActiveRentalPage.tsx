import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import {
  ArrowLeft,
  Smartphone,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { rentalsApi } from "@/api/rentals";
import { paymentsApi } from "@/api/payments";

function formatDate(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useCountdown(target: string | null) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    const tick = () => {
      const diff = t - Date.now();
      if (diff <= 0) {
        setText("сейчас");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(h > 0 ? `${h} ч ${m} мин` : `${m} мин`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);
  return text;
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge variant="success" size="md">
          Активна
        </Badge>
      );
    case "paused_payment_failed":
      return (
        <Badge variant="danger" size="md">
          Оплата не прошла
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="danger" size="md">
          Просрочена
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="md">
          {status}
        </Badge>
      );
  }
}

export function ActiveRentalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => paymentsApi.listMethods(),
  });

  const countdown = useCountdown(rental?.next_charge_at ?? null);
  const defaultCard = methods.find((m) => m.is_default);

  if (isLoading || !rental) {
    return (
      <div className="flex items-center justify-center py-64">
        <Spinner size={32} />
      </div>
    );
  }

  // Redirect booked rentals to booked page
  if (rental.status === "booked") {
    navigate(`/rental/${id}/booked`, { replace: true });
    return null;
  }

  const isPaused = rental.status === "paused_payment_failed";
  const isOverdue = rental.status === "overdue";

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate("/rentals")} className="text-ink-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="h3 m-0">Аренда</h2>
      </div>

      <div className="px-16 py-20 flex flex-col gap-16">
        {/* Payment failed banner */}
        {isPaused && (
          <Card variant="filled" padding={16}>
            <div className="flex items-start gap-12">
              <AlertTriangle
                size={20}
                className="text-danger-ink shrink-0 mt-2"
              />
              <div>
                <p className="body-sm font-semibold text-danger-ink m-0">
                  Не удалось списать 349 &#8381;
                </p>
                <p className="caption text-ink-500 m-0 mt-4">
                  Пополни карту — без этого через 24 часа накопится долг.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isOverdue && (
          <Card variant="filled" padding={16}>
            <div className="flex items-start gap-12">
              <AlertTriangle
                size={20}
                className="text-danger-ink shrink-0 mt-2"
              />
              <div>
                <p className="body-sm font-semibold text-danger-ink m-0">
                  Просроченная аренда
                </p>
                <p className="caption text-ink-500 m-0 mt-4">
                  Задолженность: {rental.debt_amount.toLocaleString("ru-RU")}{" "}
                  &#8381;. Верни устройство на любую точку.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Device card */}
        <Card variant="elevated" padding={20}>
          <div className="flex items-center gap-16">
            <div className="w-56 h-56 bg-ink-100 rounded-16 flex items-center justify-center shrink-0">
              <Smartphone size={28} className="text-ink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-8">
                <p className="body font-semibold m-0">{rental.device.model}</p>
                {statusBadge(rental.status)}
              </div>
              <p className="caption text-ink-500 m-0 mt-4">
                #{rental.device.short_code}
                {rental.device.color ? ` / ${rental.device.color}` : ""}
              </p>
            </div>
          </div>
        </Card>

        {/* Rental details */}
        <Card variant="filled" padding={20}>
          <div className="flex flex-col gap-12">
            <div className="flex justify-between items-start">
              <span className="body-sm text-ink-500">Оплачено до</span>
              <span className="body font-semibold text-ink-900">
                {formatDate(rental.paid_until)}
              </span>
            </div>
            {countdown && (
              <div className="flex justify-between">
                <span className="body-sm text-ink-500">
                  Следующее списание
                </span>
                <span className="body-sm text-ink-900">через {countdown}</span>
              </div>
            )}
            <hr className="border-ink-200 m-0" />
            <div className="flex justify-between">
              <span className="body-sm text-ink-500">Тариф</span>
              <span className="body-sm text-ink-900">349 &#8381;/сутки</span>
            </div>
            <div className="flex justify-between">
              <span className="body-sm text-ink-500">Залог</span>
              <span className="body-sm text-ink-900">
                {rental.deposit_amount
                  ? `${rental.deposit_amount.toLocaleString("ru-RU")} \u20BD`
                  : "---"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="body-sm text-ink-500">Всего списано</span>
              <span className="body-sm text-ink-900">
                {rental.total_charged.toLocaleString("ru-RU")} &#8381;
              </span>
            </div>
            {defaultCard && (
              <div className="flex justify-between items-center">
                <span className="body-sm text-ink-500">Карта</span>
                <span className="body-sm text-ink-900 flex items-center gap-4">
                  <CreditCard size={14} />
                  **** {defaultCard.card_last4}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Location */}
        <Card variant="outlined" padding={16}>
          <div className="flex justify-between">
            <span className="body-sm text-ink-500">Точка выдачи</span>
            <span className="body-sm text-ink-900 text-right">
              {rental.location_name}
            </span>
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col gap-12 mt-8">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={RotateCcw}
            onClick={() => navigate(`/rental/${id}/return`)}
          >
            Сдать устройство
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            icon={MessageCircle}
            onClick={() => navigate(`/rental/${id}/incident`)}
          >
            Сообщить о проблеме
          </Button>
        </div>
      </div>
    </div>
  );
}
