import { useEffect, useState } from "react";
import { Battery, BatteryFull, BatteryLow, BatteryMedium, ScanLine } from "lucide-react";
import { Badge, Button, Card, Spinner } from "@deliphone/ui";
import { inventoryApi } from "@/api/partner";

type Device = {
  id: string;
  model: string;
  imei: string;
  short_code: string;
  serial_number: string;
  status: string;
  battery_level: number | null;
  assigned_to: string | null;
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "info"> = {
  free: "success", location: "success",
  rented: "info", with_client: "info",
  maintenance: "warning", in_service: "warning",
  blocked: "danger", missing: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  free: "Свободен", location: "Свободен",
  rented: "В аренде", with_client: "В аренде",
  maintenance: "Обслуживание", in_service: "В сервисе",
  blocked: "Заблокирован", missing: "Утрачен",
};

function BatteryIcon({ level }: { level: number | null }) {
  if (level == null) return <span className="caption text-ink-300">—</span>;
  const color = level > 60 ? "#1E8E4F" : level > 20 ? "#B8730A" : "#D2342A";
  const Ico = level > 80 ? BatteryFull : level > 40 ? BatteryMedium : level > 15 ? BatteryLow : Battery;
  return (
    <span className="inline-flex items-center gap-4">
      <Ico size={18} style={{ color }} />
      <span className="caption font-medium" style={{ color }}>{level}%</span>
    </span>
  );
}

export function InventoryPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryApi.list();
        setDevices(res.devices ?? res ?? []);
      } catch {
        // handle error silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-48">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-24">
      <div className="flex items-center justify-between">
        <h1 className="h2 text-ink-900">Инвентарь</h1>
        <Button variant="ghost" size="lg" icon={ScanLine}>
          Аудит
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card variant="outlined" padding={32}>
          <p className="body text-ink-500 text-center">Нет устройств на точке</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="text-left body-sm text-ink-500 py-12 px-8">Модель</th>
                <th className="text-left body-sm text-ink-500 py-12 px-8">Код</th>
                <th className="text-left body-sm text-ink-500 py-12 px-8">IMEI</th>
                <th className="text-left body-sm text-ink-500 py-12 px-8">Заряд</th>
                <th className="text-left body-sm text-ink-500 py-12 px-8">Статус</th>
                <th className="text-left body-sm text-ink-500 py-12 px-8">Арендатор</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-ink-100 hover:bg-ink-50 transition-colors">
                  <td className="body text-ink-900 py-12 px-8">{d.model}</td>
                  <td className="mono text-ink-700 py-12 px-8">#{d.short_code || "—"}</td>
                  <td className="mono text-ink-500 py-12 px-8">{d.imei?.slice(-4) || "—"}</td>
                  <td className="py-12 px-8"><BatteryIcon level={d.battery_level} /></td>
                  <td className="py-12 px-8">
                    <Badge variant={STATUS_VARIANTS[d.status] ?? "info"} size="sm">
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </td>
                  <td className="body-sm text-ink-500 py-12 px-8">{d.assigned_to ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
