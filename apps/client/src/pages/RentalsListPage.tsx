import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import { Smartphone, ChevronRight } from "lucide-react";
import { rentalsApi, type RentalBrief } from "@/api/rentals";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success" size="sm">Активна</Badge>;
    case "booked":
      return <Badge variant="info" size="sm">Забронирована</Badge>;
    case "paused_payment_failed":
      return <Badge variant="danger" size="sm">Оплата не прошла</Badge>;
    case "overdue":
      return <Badge variant="danger" size="sm">Просрочена</Badge>;
    case "closed":
      return <Badge variant="neutral" size="sm">Завершена</Badge>;
    case "cancelled_timeout":
      return <Badge variant="outline" size="sm">Истекла</Badge>;
    case "cancelled":
      return <Badge variant="outline" size="sm">Отменена</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{status}</Badge>;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RentalCard({ rental }: { rental: RentalBrief }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (rental.status === "booked") {
      navigate(`/rental/${rental.id}/booked`);
    } else if (
      rental.status === "active" ||
      rental.status === "paused_payment_failed" ||
      rental.status === "overdue"
    ) {
      navigate(`/rental/${rental.id}`);
    }
  };

  const isClickable =
    rental.status === "booked" ||
    rental.status === "active" ||
    rental.status === "paused_payment_failed" ||
    rental.status === "overdue";

  return (
    <Card
      variant="outlined"
      padding={16}
      onClick={isClickable ? handleClick : undefined}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <div className="flex items-center gap-12">
        <div className="w-44 h-44 bg-ink-100 rounded-12 flex items-center justify-center shrink-0">
          <Smartphone size={22} className="text-ink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-8">
            <p className="body-sm font-semibold m-0 truncate">
              {rental.device.model}
            </p>
            {statusBadge(rental.status)}
          </div>
          <p className="caption text-ink-500 m-0 mt-2">
            {rental.location_name}
            {rental.activated_at && ` / ${formatDate(rental.activated_at)}`}
          </p>
          {rental.status === "closed" && (
            <p className="caption text-ink-400 m-0 mt-2">
              Итого: {rental.total_charged.toLocaleString("ru-RU")} &#8381;
            </p>
          )}
        </div>
        {isClickable && (
          <ChevronRight size={16} className="text-ink-300 shrink-0" />
        )}
      </div>
    </Card>
  );
}

export function RentalsListPage() {
  const [tab, setTab] = useState<"active" | "history">("active");

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ["rentals", "active"],
    queryFn: () => rentalsApi.list("active"),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["rentals", "history"],
    queryFn: () => rentalsApi.list("history"),
    enabled: tab === "history",
  });

  const activeRentals = activeData?.items ?? [];
  const historyRentals = historyData?.items ?? [];
  const isLoading = tab === "active" ? activeLoading : historyLoading;
  const rentals = tab === "active" ? activeRentals : historyRentals;

  return (
    <div className="px-16 py-20">
      <h1 className="h2 m-0 mb-16">Аренды</h1>

      {/* Tabs */}
      <div className="flex gap-8 mb-20">
        <button
          onClick={() => setTab("active")}
          className="px-16 py-8 rounded-full body-sm font-semibold transition-colors"
          style={{
            background: tab === "active" ? "var(--ink-900)" : "var(--ink-100)",
            color: tab === "active" ? "#fff" : "var(--ink-600)",
          }}
        >
          Активные
          {activeRentals.length > 0 && ` (${activeRentals.length})`}
        </button>
        <button
          onClick={() => setTab("history")}
          className="px-16 py-8 rounded-full body-sm font-semibold transition-colors"
          style={{
            background: tab === "history" ? "var(--ink-900)" : "var(--ink-100)",
            color: tab === "history" ? "#fff" : "var(--ink-600)",
          }}
        >
          Завершённые
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-40">
          <Spinner size={28} />
        </div>
      ) : rentals.length === 0 ? (
        <Card variant="filled" padding={32}>
          <div className="flex flex-col items-center gap-12 text-center">
            <Smartphone size={32} className="text-ink-300" />
            <p className="body text-ink-500 m-0">
              {tab === "active"
                ? "Нет активных аренд"
                : "История аренд пуста"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-12">
          {rentals.map((rental) => (
            <RentalCard key={rental.id} rental={rental} />
          ))}
        </div>
      )}
    </div>
  );
}
