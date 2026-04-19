import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import { ArrowLeft, MapPin, Shield, Star, Check } from "lucide-react";
import { locationsApi, type DeviceBrief, type LocationDetail } from "@/api/locations";
import { rentalsApi } from "@/api/rentals";
import { paymentsApi } from "@/api/payments";

type Step = "device" | "deposit" | "confirm";

export function BookingPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("device");
  const [selectedDevice, setSelectedDevice] = useState<DeviceBrief | null>(null);
  const [withUdobno, setWithUdobno] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { data: location, isLoading: locLoading } = useQuery({
    queryKey: ["location", locationId],
    queryFn: () => locationsApi.get(locationId!),
    enabled: !!locationId,
  });

  const { data: devices = [], isLoading: devLoading } = useQuery({
    queryKey: ["location-devices", locationId],
    queryFn: () => locationsApi.getDevices(locationId!),
    enabled: !!locationId,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => paymentsApi.getSubscription(),
  });

  const hasUdobno = subscription?.status === "active";

  const createRental = useMutation({
    mutationFn: () =>
      rentalsApi.create({
        device_id: selectedDevice!.id,
        location_id: locationId!,
        with_udobno_subscription: withUdobno,
      }),
    onSuccess: (rental) => {
      navigate(`/rental/${rental.id}/booked`, { replace: true });
    },
  });

  if (locLoading || devLoading) {
    return (
      <div className="flex items-center justify-center py-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="px-16 py-20">
        <p className="body text-ink-500">Точка не найдена</p>
      </div>
    );
  }

  // Auto-select if single device (MVP: only Redmi A5)
  if (devices.length === 1 && !selectedDevice) {
    setSelectedDevice(devices[0]);
  }

  const depositAmount = hasUdobno || withUdobno ? 1500 : 4500;

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button
          onClick={() => {
            if (step === "device") navigate(-1);
            else if (step === "deposit") setStep("device");
            else setStep("deposit");
          }}
          className="text-ink-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="h3 m-0">
          {step === "device" && "Выбор устройства"}
          {step === "deposit" && "Условия залога"}
          {step === "confirm" && "Подтверждение"}
        </h2>
      </div>

      <div className="px-16 py-20">
        {/* Location info */}
        <div className="flex items-start gap-8 mb-20">
          <MapPin size={16} className="text-ink-400 mt-2 shrink-0" />
          <div>
            <p className="body-sm text-ink-700 m-0">{location.name}</p>
            <p className="caption text-ink-400 m-0">{location.address}</p>
          </div>
        </div>

        {/* Step 1: Device selection */}
        {step === "device" && (
          <div className="flex flex-col gap-12">
            {devices.length === 0 && (
              <Card variant="filled" padding={24}>
                <p className="body text-ink-500 m-0 text-center">
                  Нет доступных устройств на этой точке
                </p>
              </Card>
            )}
            {devices.map((device) => (
              <Card
                key={device.id}
                variant={selectedDevice?.id === device.id ? "elevated" : "outlined"}
                padding={16}
                onClick={() => setSelectedDevice(device)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-12">
                  <div className="w-48 h-48 bg-ink-100 rounded-12 flex items-center justify-center text-ink-400 shrink-0">
                    📱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="body m-0 font-semibold">{device.model}</p>
                    <p className="caption text-ink-500 m-0">
                      {[device.color, device.storage].filter(Boolean).join(" / ") || `#${device.short_code}`}
                    </p>
                    {device.condition_grade != null && (
                      <Badge variant="neutral" size="sm" style={{ marginTop: 4 }}>
                        Состояние: {device.condition_grade}/10
                      </Badge>
                    )}
                  </div>
                  {selectedDevice?.id === device.id && (
                    <Check size={20} className="text-accent" />
                  )}
                </div>
              </Card>
            ))}

            <div className="mt-8">
              <p className="body-sm text-ink-500 m-0 mb-4">Тариф</p>
              <p className="h3 m-0">349 &#8381;/сутки</p>
              <p className="caption text-ink-400 m-0">Автосписание каждые 24 часа</p>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedDevice}
              onClick={() => setStep(hasUdobno ? "confirm" : "deposit")}
            >
              Далее
            </Button>
          </div>
        )}

        {/* Step 2: Deposit choice */}
        {step === "deposit" && (
          <div className="flex flex-col gap-16">
            <Card
              variant={!withUdobno ? "elevated" : "outlined"}
              padding={20}
              onClick={() => setWithUdobno(false)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-start gap-12">
                <div className="w-40 h-40 rounded-full bg-ink-100 flex items-center justify-center shrink-0 mt-2">
                  <Shield size={20} className="text-ink-600" />
                </div>
                <div className="flex-1">
                  <p className="body font-semibold m-0">Без подписки</p>
                  <p className="h2 m-0 mt-4">4 500 &#8381;</p>
                  <p className="body-sm text-ink-500 m-0 mt-4">
                    Залог замораживается на карте, вернётся при сдаче устройства
                  </p>
                </div>
                {!withUdobno && <Check size={20} className="text-accent shrink-0" />}
              </div>
            </Card>

            <Card
              variant={withUdobno ? "elevated" : "outlined"}
              padding={20}
              onClick={() => setWithUdobno(true)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-start gap-12">
                <div className="w-40 h-40 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-2">
                  <Star size={20} className="text-ink-900" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-8">
                    <p className="body font-semibold m-0">Подписка «Удобно»</p>
                    <Badge variant="accent" size="sm">199 &#8381;/мес</Badge>
                  </div>
                  <p className="h2 m-0 mt-4">1 500 &#8381;</p>
                  <p className="body-sm text-ink-500 m-0 mt-4">
                    Залог в 3 раза ниже + приоритетная поддержка + резервное устройство
                  </p>
                  <p className="caption text-ink-400 m-0 mt-4">
                    Первое списание через 24 часа. Отмена в любой момент.
                  </p>
                </div>
                {withUdobno && <Check size={20} className="text-accent shrink-0" />}
              </div>
            </Card>

            <Button variant="primary" size="lg" fullWidth onClick={() => setStep("confirm")}>
              Далее
            </Button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && selectedDevice && (
          <div className="flex flex-col gap-16">
            <Card variant="filled" padding={20}>
              <div className="flex flex-col gap-12">
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Точка</span>
                  <span className="body-sm text-ink-900 text-right">{location.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Устройство</span>
                  <span className="body-sm text-ink-900">{selectedDevice.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Тариф</span>
                  <span className="body-sm text-ink-900">349 &#8381; / 24 часа</span>
                </div>
                <hr className="border-ink-200 m-0" />
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Залог (холд)</span>
                  <span className="body font-semibold text-ink-900">
                    {depositAmount.toLocaleString("ru-RU")} &#8381;
                  </span>
                </div>
                {withUdobno && (
                  <div className="flex justify-between">
                    <span className="body-sm text-ink-500">Подписка «Удобно»</span>
                    <span className="body-sm text-ink-900">199 &#8381;/мес</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="body-sm text-ink-500">Бронь действует</span>
                  <span className="body-sm text-ink-900">30 минут</span>
                </div>
              </div>
            </Card>

            <label className="flex items-start gap-12 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-2 w-18 h-18 accent-ink-900"
              />
              <span className="body-sm text-ink-600">
                Согласен с{" "}
                <a href="/docs/oferta" className="text-ink-900 underline">
                  условиями проката
                </a>
              </span>
            </label>

            {createRental.error && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-danger-ink m-0">
                  Ошибка: {(createRental.error as Error).message}
                </p>
              </Card>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!agreed}
              loading={createRental.isPending}
              onClick={() => createRental.mutate()}
            >
              Забронировать
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
