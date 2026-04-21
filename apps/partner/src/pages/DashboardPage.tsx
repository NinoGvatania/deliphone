import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackageCheck,
  PackageOpen,
  Warehouse,
  Wallet,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { Button, Card, Spinner } from "@deliphone/ui";
import { dashboardApi, type DashboardData } from "@/api/partner";
import { useAuthStore } from "@/stores/auth";

const REFRESH_INTERVAL = 30_000;

export function DashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const res = await dashboardApi.get();
        if (!cancelled) setData(res);
      } catch {
        // silently retry on next interval
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const id = setInterval(fetch, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-48">
        <Spinner size={32} />
      </div>
    );
  }

  const stats = data ?? {
    awaiting_issue: 0,
    awaiting_return: 0,
    devices_total: 0,
    devices_free: 0,
    revenue_today: 0,
    rentals_today: 0,
    commission_today: 0,
  };

  return (
    <div className="flex flex-col gap-24">
      {/* Stats */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Сейчас</div>
        <div className="grid grid-cols-3 gap-12">
          <StatCard label="Ожидают выдачу" value={stats.awaiting_issue} />
          <StatCard label="Ожидают возврат" value={stats.awaiting_return} />
          <StatCard
            label="Устройств на точке"
            value={stats.devices_total}
            hint={`свободных: ${stats.devices_free}`}
          />
        </div>
      </section>

      {/* Primary actions */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Что делаем?</div>
        <div className="grid grid-cols-2 gap-12">
          <Button
            variant="primary"
            size="lg"
            icon={PackageOpen}
            fullWidth
            onClick={() => navigate("/issue")}
          >
            Выдать устройство
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={PackageCheck}
            fullWidth
            onClick={() => navigate("/return")}
          >
            Принять устройство
          </Button>
        </div>
      </section>

      {/* Earnings today */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Сегодня</div>
        <div className="grid grid-cols-3 gap-12">
          <StatCard
            label="Выручка"
            value={`${(stats.revenue_today ?? 0).toLocaleString("ru-RU")} \u20BD`}
          />
          <StatCard label="Выдач сегодня" value={stats.rentals_today ?? 0} />
          <StatCard
            label="Комиссия"
            value={`${(stats.commission_today ?? 0).toLocaleString("ru-RU")} \u20BD`}
          />
        </div>
      </section>

      {/* Navigation */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Разделы</div>
        <div className="grid grid-cols-4 gap-12">
          <Button
            variant="ghost"
            size="lg"
            icon={Warehouse}
            fullWidth
            onClick={() => navigate("/inventory")}
          >
            Инвентарь
          </Button>
          <Button
            variant="ghost"
            size="lg"
            icon={Wallet}
            fullWidth
            onClick={() => navigate("/finance")}
          >
            Финансы
          </Button>
          <Button
            variant="ghost"
            size="lg"
            icon={MessageCircle}
            fullWidth
            onClick={() => navigate("/support")}
          >
            Поддержка
          </Button>
          <Button
            variant="ghost"
            size="lg"
            icon={LogOut}
            fullWidth
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Выйти
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card variant="outlined" padding={20}>
      <div className="body-sm text-ink-500">{label}</div>
      <div className="display text-ink-900 mt-8 leading-none">{value}</div>
      {hint && <div className="body-sm text-ink-500 mt-8">{hint}</div>}
    </Card>
  );
}
