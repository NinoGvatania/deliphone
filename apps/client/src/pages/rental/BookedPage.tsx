import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import { ArrowLeft, Navigation, Clock } from "lucide-react";
import { rentalsApi } from "@/api/rentals";

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining("00:00");
        setExpired(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { remaining, expired };
}

export function BookedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const { remaining, expired } = useCountdown(rental?.booking_expires_at ?? null);

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancelBooking(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      navigate("/", { replace: true });
    },
  });

  // Redirect if status changed from booked
  useEffect(() => {
    if (!rental) return;
    if (rental.status === "active") {
      navigate(`/rental/${id}`, { replace: true });
    } else if (
      rental.status !== "booked" &&
      rental.status !== "pending_pickup"
    ) {
      navigate("/", { replace: true });
    }
  }, [rental?.status, id, navigate]);

  if (isLoading || !rental) {
    return (
      <div className="flex items-center justify-center py-64">
        <Spinner size={32} />
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(rental.id)}`;

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate("/")} className="text-ink-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="h3 m-0">Бронь</h2>
      </div>

      <div className="px-16 py-20 flex flex-col items-center gap-20">
        {/* Timer */}
        <Card variant="elevated" padding={24} style={{ width: "100%" }}>
          <div className="flex flex-col items-center gap-8">
            <Clock size={24} className="text-ink-400" />
            <p className="caption text-ink-500 m-0">До конца брони</p>
            <p
              className="m-0 font-semibold"
              style={{
                fontSize: 48,
                fontVariantNumeric: "tabular-nums",
                color: expired ? "var(--danger)" : "var(--ink-900)",
              }}
            >
              {remaining}
            </p>
            {expired && (
              <Badge variant="danger" size="md">
                Бронь истекла
              </Badge>
            )}
          </div>
        </Card>

        {/* QR Code */}
        <Card variant="filled" padding={24} style={{ width: "100%" }}>
          <div className="flex flex-col items-center gap-12">
            <p className="body font-semibold m-0">
              Покажи QR оператору на точке
            </p>
            <img
              src={qrUrl}
              alt="QR-код брони"
              width={200}
              height={200}
              className="rounded-8"
            />
            <p className="mono text-ink-500" style={{ fontSize: 12 }}>
              {rental.id}
            </p>
          </div>
        </Card>

        {/* Device & location info */}
        <Card variant="outlined" padding={16} style={{ width: "100%" }}>
          <div className="flex flex-col gap-8">
            <div className="flex justify-between">
              <span className="body-sm text-ink-500">Устройство</span>
              <span className="body-sm text-ink-900">
                {rental.device.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="body-sm text-ink-500">Точка</span>
              <span className="body-sm text-ink-900 text-right">
                {rental.location_name}
              </span>
            </div>
          </div>
        </Card>

        {/* Route button */}
        <Button
          variant="ghost"
          size="md"
          icon={Navigation}
          fullWidth
          onClick={() =>
            window.open(
              `https://yandex.ru/maps/?text=${encodeURIComponent(rental.location_name)}`,
              "_blank",
            )
          }
        >
          Маршрут до точки
        </Button>

        {/* Cancel booking */}
        {!showCancel ? (
          <Button
            variant="destructive"
            size="md"
            fullWidth
            disabled={expired}
            onClick={() => setShowCancel(true)}
          >
            Отменить бронь
          </Button>
        ) : (
          <Card variant="filled" padding={16} style={{ width: "100%" }}>
            <p className="body-sm text-ink-700 m-0 mb-12">
              Залог вернётся в течение 1-7 дней. Отменить бронь?
            </p>
            <div className="flex gap-12">
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setShowCancel(false)}
              >
                Нет
              </Button>
              <Button
                variant="destructive"
                size="md"
                fullWidth
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Да, отменить
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
