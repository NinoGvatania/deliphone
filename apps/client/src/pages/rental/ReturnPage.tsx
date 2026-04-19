import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Badge, Spinner } from "@deliphone/ui";
import {
  ArrowLeft,
  ShieldAlert,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { rentalsApi } from "@/api/rentals";

type ReturnStep = "frp_warning" | "scan" | "confirm" | "waiting" | "result";

export function ReturnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ReturnStep>("frp_warning");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanRegionRef = useRef<HTMLDivElement>(null);

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id!),
    enabled: !!id,
    refetchInterval: step === "waiting" ? 5_000 : false,
  });

  const initReturn = useMutation({
    mutationFn: () => rentalsApi.initReturn(id!),
  });

  const confirmReturn = useMutation({
    mutationFn: () => rentalsApi.confirmReturn(id!, { return_session_id: sessionId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      setStep("waiting");
    },
  });

  const disputeMutation = useMutation({
    mutationFn: () => rentalsApi.reportReturnDispute(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      navigate("/rentals", { replace: true });
    },
  });

  // Start QR scanner
  const startScanner = useCallback(async () => {
    if (!scanRegionRef.current) return;
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          setSessionId(text);
          scanner.stop().catch(() => {});
          setStep("confirm");
        },
        () => {},
      );
    } catch {
      setScanError("Не удалось открыть камеру. Разреши доступ в настройках.");
    }
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  // Start scanner when entering scan step
  useEffect(() => {
    if (step === "scan") {
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    }
  }, [step, startScanner]);

  // Detect result from polling
  useEffect(() => {
    if (step === "waiting" && rental) {
      if (rental.status === "closed") setStep("result");
      if (rental.status === "pending_return_dispute") setStep("result");
    }
  }, [step, rental?.status]);

  if (isLoading || !rental) {
    return (
      <div className="flex items-center justify-center py-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button
          onClick={() => {
            if (step === "frp_warning") navigate(`/rental/${id}`);
            else if (step === "scan") {
              scannerRef.current?.stop().catch(() => {});
              setStep("frp_warning");
            } else if (step === "confirm") setStep("scan");
          }}
          className="text-ink-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="h3 m-0">Сдать устройство</h2>
      </div>

      <div className="px-16 py-20 flex flex-col gap-20">
        {/* Step 1: FRP Warning */}
        {step === "frp_warning" && (
          <>
            <Card variant="filled" padding={24}>
              <div className="flex flex-col items-center gap-16 text-center">
                <ShieldAlert size={48} className="text-warning-ink" />
                <div>
                  <p className="body font-semibold m-0">
                    Перед сдачей выйди из Google-аккаунта
                  </p>
                  <p className="body-sm text-ink-500 m-0 mt-8">
                    Настройки &rarr; Google &rarr; Удалить аккаунт с устройства
                  </p>
                  <p className="body-sm text-ink-500 m-0 mt-8">
                    Если не выйти — удержание 1 500 &#8381; из залога до разблокировки.
                  </p>
                </div>
              </div>
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={initReturn.isPending}
              onClick={() => {
                initReturn.mutate();
                setStep("scan");
              }}
            >
              Я вышел из Google, продолжить
            </Button>
          </>
        )}

        {/* Step 2: QR Scanner */}
        {step === "scan" && (
          <>
            <Card variant="filled" padding={24}>
              <div className="flex flex-col items-center gap-12 text-center">
                <Camera size={32} className="text-ink-400" />
                <p className="body font-semibold m-0">
                  Отсканируй QR оператора на точке
                </p>
                <p className="body-sm text-ink-500 m-0">
                  Попроси оператора показать QR приёма
                </p>
              </div>
            </Card>

            <div
              id="qr-reader"
              ref={scanRegionRef}
              className="rounded-16 overflow-hidden"
              style={{ width: "100%", minHeight: 300 }}
            />

            {scanError && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-danger-ink m-0">{scanError}</p>
              </Card>
            )}
          </>
        )}

        {/* Step 3: Confirm return */}
        {step === "confirm" && (
          <>
            <Card variant="elevated" padding={24}>
              <div className="flex flex-col items-center gap-16 text-center">
                <CheckCircle size={48} className="text-success-ink" />
                <div>
                  <p className="body font-semibold m-0">
                    Подтверди возврат
                  </p>
                  <p className="body-sm text-ink-500 m-0 mt-8">
                    {rental.device.model}, #{rental.device.short_code}
                  </p>
                  <p className="body-sm text-ink-500 m-0 mt-4">
                    Точка: {rental.location_name}
                  </p>
                </div>
              </div>
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={confirmReturn.isPending}
              onClick={() => confirmReturn.mutate()}
            >
              Подтвердить возврат
            </Button>

            {confirmReturn.error && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-danger-ink m-0">
                  Ошибка: {(confirmReturn.error as Error).message}
                </p>
              </Card>
            )}
          </>
        )}

        {/* Step 4: Waiting for inspection */}
        {step === "waiting" && rental.status !== "closed" && rental.status !== "pending_return_dispute" && (
          <Card variant="filled" padding={32}>
            <div className="flex flex-col items-center gap-16 text-center">
              <Clock size={48} className="text-ink-400 animate-pulse" />
              <div>
                <p className="body font-semibold m-0">
                  Оператор проверяет устройство
                </p>
                <p className="body-sm text-ink-500 m-0 mt-8">
                  Подожди, пока оператор завершит осмотр. Обычно это занимает 5-10 минут.
                </p>
              </div>
              <Spinner size={24} />
            </div>
          </Card>
        )}

        {/* Step 5: Result */}
        {step === "result" && (
          <>
            {rental.status === "closed" && (
              <Card variant="elevated" padding={32}>
                <div className="flex flex-col items-center gap-16 text-center">
                  <CheckCircle size={56} className="text-success-ink" />
                  <div>
                    <p className="h3 m-0">Устройство сдано</p>
                    <p className="body-sm text-ink-500 m-0 mt-8">
                      Залог вернётся в течение 1-7 дней в зависимости от банка.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {rental.status === "pending_return_dispute" && (
              <Card variant="elevated" padding={24}>
                <div className="flex flex-col items-center gap-16 text-center">
                  <XCircle size={48} className="text-danger-ink" />
                  <div>
                    <p className="body font-semibold m-0">
                      Обнаружены повреждения
                    </p>
                    <p className="body-sm text-ink-500 m-0 mt-8">
                      Оператор зафиксировал повреждения. Ты можешь принять оценку или оспорить.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {rental.status === "pending_return_dispute" && (
              <div className="flex flex-col gap-12">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => navigate("/rentals", { replace: true })}
                >
                  Принять
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  loading={disputeMutation.isPending}
                  onClick={() => disputeMutation.mutate()}
                >
                  Оспорить
                </Button>
              </div>
            )}

            {rental.status === "closed" && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate("/", { replace: true })}
              >
                На главную
              </Button>
            )}
          </>
        )}

        {/* "Partner didn't process return" fallback */}
        {(step === "waiting" || step === "scan") && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              scannerRef.current?.stop().catch(() => {});
              disputeMutation.mutate();
            }}
            loading={disputeMutation.isPending}
          >
            Я сдал устройство, но не получаю подтверждение
          </Button>
        )}
      </div>
    </div>
  );
}
