import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import { ArrowLeft, MapPin, Shield, Star, Check, Smartphone } from "lucide-react";
import { locationsApi, type DeviceBrief } from "@/api/locations";
import { rentalsApi } from "@/api/rentals";
import { paymentsApi } from "@/api/payments";

type Step = "devices" | "deposit" | "confirm";

export function RentPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("devices");
  const [selected, setSelected] = useState<DeviceBrief | null>(null);
  const [withUdobno, setWithUdobno] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { data: location, isLoading: locLoad } = useQuery({
    queryKey: ["location", locationId],
    queryFn: () => locationsApi.get(locationId!),
    enabled: !!locationId,
  });

  const { data: devices = [], isLoading: devLoad } = useQuery({
    queryKey: ["devices", locationId],
    queryFn: () => locationsApi.getDevices(locationId!),
    enabled: !!locationId,
  });

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => paymentsApi.getSubscription(),
  });

  const hasUdobno = sub?.status === "active";
  const deposit = hasUdobno || withUdobno ? 1500 : 4500;

  const rent = useMutation({
    mutationFn: () =>
      rentalsApi.create({
        device_id: selected!.id,
        location_id: locationId!,
        with_udobno_subscription: withUdobno,
      }),
    onSuccess: (r) => navigate(`/rental/${r.id}`, { replace: true }),
  });

  if (devices.length === 1 && !selected) setSelected(devices[0]!);

  if (locLoad || devLoad) {
    return <div className="flex items-center justify-center py-64"><Spinner size={32} /></div>;
  }

  const goBack = () => {
    if (step === "devices") navigate(-1);
    else if (step === "deposit") setStep("devices");
    else setStep(hasUdobno ? "devices" : "deposit");
  };

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={goBack} className="text-ink-600"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h2 className="body font-semibold m-0">Взять в аренду</h2>
          {location && (
            <p className="caption text-ink-500 m-0 flex items-center gap-4">
              <MapPin size={12} /> {location.name}
            </p>
          )}
        </div>
      </div>

      <div className="px-16 py-20">
        {/* ── Devices ── */}
        {step === "devices" && (
          <div className="flex flex-col gap-12">
            <p className="body-sm text-ink-500 m-0">Доступные устройства</p>

            {devices.length === 0 && (
              <Card variant="filled" padding={24}>
                <p className="body text-ink-500 m-0 text-center">Нет свободных устройств</p>
              </Card>
            )}

            {devices.map((d) => (
              <Card
                key={d.id}
                variant={selected?.id === d.id ? "elevated" : "outlined"}
                padding={16}
                onClick={() => setSelected(d)}
              >
                <div className="flex items-center gap-12">
                  <div
                    className="flex items-center justify-center shrink-0 bg-ink-100"
                    style={{ width: 48, height: 48, borderRadius: 12 }}
                  >
                    <Smartphone size={22} className="text-ink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="body font-semibold m-0">{d.model}</p>
                    <p className="caption text-ink-500 m-0">
                      {[d.color, d.storage].filter(Boolean).join(" · ")} · #{d.short_code}
                    </p>
                  </div>
                  {selected?.id === d.id && <Check size={20} className="text-accent-ink" />}
                </div>
              </Card>
            ))}

            <Button
              variant="primary" size="lg" fullWidth
              disabled={!selected}
              onClick={() => setStep(hasUdobno ? "confirm" : "deposit")}
            >
              Далее
            </Button>
          </div>
        )}

        {/* ── Deposit ── */}
        {step === "deposit" && (
          <div className="flex flex-col gap-12">
            <p className="body-sm text-ink-500 m-0">Выбери условия залога</p>

            <Card
              variant={!withUdobno ? "elevated" : "outlined"}
              padding={20}
              onClick={() => setWithUdobno(false)}
            >
              <div className="flex items-start gap-12">
                <Shield size={20} className="text-ink-600 shrink-0 mt-2" />
                <div className="flex-1">
                  <p className="body font-semibold m-0">Стандартный залог</p>
                  <p className="h2 m-0 mt-4">4 500 ₽</p>
                  <p className="body-sm text-ink-500 m-0 mt-4">Холд на карте, вернётся при сдаче</p>
                </div>
                {!withUdobno && <Check size={20} className="text-accent-ink shrink-0" />}
              </div>
            </Card>

            <Card
              variant={withUdobno ? "elevated" : "outlined"}
              padding={20}
              onClick={() => setWithUdobno(true)}
            >
              <Badge variant="accent" size="sm" style={{ marginBottom: 8 }}>Выгоднее</Badge>
              <div className="flex items-start gap-12">
                <Star size={20} className="text-ink-900 shrink-0 mt-2" />
                <div className="flex-1">
                  <p className="body font-semibold m-0">С подпиской «Удобно»</p>
                  <p className="h2 m-0 mt-4">1 500 ₽</p>
                  <p className="body-sm text-ink-500 m-0 mt-4">
                    + 199 ₽/мес · Приоритет поддержки · Резервное устройство
                  </p>
                  <p className="caption text-ink-400 m-0 mt-4">Отмена в любой момент</p>
                </div>
                {withUdobno && <Check size={20} className="text-accent-ink shrink-0" />}
              </div>
            </Card>

            <Button variant="primary" size="lg" fullWidth onClick={() => setStep("confirm")}>
              Далее
            </Button>
          </div>
        )}

        {/* ── Confirm ── */}
        {step === "confirm" && selected && (
          <div className="flex flex-col gap-16">
            <Card variant="filled" padding={20}>
              <div className="flex flex-col gap-10">
                <Row label="Точка" value={location?.name ?? ""} />
                <Row label="Устройство" value={`${selected.model} #${selected.short_code}`} />
                <Row label="Тариф" value="349 ₽ / 24 часа" />
                <div className="h-px bg-ink-200" />
                <Row label="Залог (холд)" value={`${deposit.toLocaleString("ru-RU")} ₽`} bold />
                {withUdobno && <Row label="Удобно" value="199 ₽/мес" />}
              </div>
            </Card>

            <label className="flex items-start gap-12 cursor-pointer">
              <input
                type="checkbox" checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-2 accent-ink-900"
                style={{ width: 18, height: 18 }}
              />
              <span className="body-sm text-ink-600">Согласен с условиями проката</span>
            </label>

            {rent.error && (
              <p className="body-sm text-danger m-0">{(rent.error as Error).message}</p>
            )}

            <Button
              variant="primary" size="lg" fullWidth
              disabled={!agreed} loading={rent.isPending}
              onClick={() => rent.mutate()}
            >
              Начать аренду
            </Button>

            <p className="caption text-ink-400 text-center m-0">
              Залог заморозится на карте. Первое списание 349 ₽ — при получении устройства.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="body-sm text-ink-500">{label}</span>
      <span className={bold ? "body font-semibold" : "body-sm"}>{value}</span>
    </div>
  );
}
