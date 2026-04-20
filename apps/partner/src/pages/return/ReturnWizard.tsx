import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  AlertTriangle,
  ClipboardCheck,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, Card, Badge, Spinner, Logo, AppHeader } from "@deliphone/ui";
import { returnApi } from "@/api/partner";
import { Html5Qrcode } from "html5-qrcode";

type Step =
  | "scan-device"
  | "show-qr"
  | "frp-check"
  | "completeness"
  | "photos"
  | "condition"
  | "incident"
  | "sanitization"
  | "finalize";

const STEP_LABELS: Record<Step, string> = {
  "scan-device": "Сканирование устройства",
  "show-qr": "QR для клиента",
  "frp-check": "Проверка FRP",
  "completeness": "Комплектность",
  "photos": "Фото устройства",
  "condition": "Оценка состояния",
  "incident": "Инцидент",
  "sanitization": "Санитарная обработка",
  "finalize": "Завершение",
};

const STEPS = Object.keys(STEP_LABELS) as Step[];

const PHOTO_LABELS = [
  "Экран",
  "Передняя панель",
  "Задняя панель",
  "Левая сторона",
  "Правая сторона",
  "Нижняя сторона",
] as const;

const CONDITION_CATEGORIES = [
  "Экран",
  "Корпус",
  "Кнопки",
  "Камера",
  "Динамик",
  "Порт зарядки",
] as const;

type ConditionRating = "ok" | "minor" | "issue";

const CHECKLIST_ITEMS = [
  "Кабель зарядки",
  "Чехол",
  "Защитное стекло",
  "SIM-лоток",
  "Инструкция",
] as const;

const SANITIZATION_ITEMS = [
  "Протёрт антисептиком",
  "Удалена защитная плёнка",
  "Сброшен до заводских",
  "Проверена работоспособность",
] as const;

export function ReturnWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("scan-device");
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnData, setReturnData] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Record<string, ConditionRating>>({});
  const [hasIncident, setHasIncident] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  function goBack() {
    if (stepIndex === 0) {
      navigate("/");
    } else {
      setStep(STEPS[stepIndex - 1]);
    }
  }

  function nextStep() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader
        sticky
        paddingInline={24}
        left={
          <button onClick={goBack} className="flex items-center gap-8 body text-ink-700">
            <ArrowLeft size={20} />
            Назад
          </button>
        }
        right={<Logo size="sm" />}
      />

      <div className="h-4 bg-ink-100">
        <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 flex items-center justify-center px-24 py-24">
        <div className="w-full max-w-[700px]">
          <h1 className="h2 text-ink-900 mb-16">{STEP_LABELS[step]}</h1>
          {error && <div className="body-sm text-danger mb-16">{error}</div>}

          {step === "scan-device" && (
            <ScanDeviceStep
              onScanned={async (imei) => {
                setLoading(true);
                setError(null);
                try {
                  const res = await returnApi.init({ device_imei: imei });
                  setReturnId(res.return_id);
                  setReturnData(res);
                  setStep("show-qr");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "show-qr" && returnId && (
            <ShowQrStep
              returnId={returnId}
              qrUrl={qrUrl}
              setQrUrl={setQrUrl}
              onClientConfirmed={() => setStep("frp-check")}
              setError={setError}
            />
          )}

          {step === "frp-check" && (
            <FrpCheckStep
              onCheck={async (cleared) => {
                if (!returnId) return;
                setLoading(true);
                try {
                  await returnApi.frpCheck(returnId, cleared);
                  setStep("completeness");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "completeness" && (
            <CompletenessStep
              onSubmit={async (items) => {
                if (!returnId) return;
                setLoading(true);
                try {
                  await returnApi.checklist(returnId, items);
                  setStep("photos");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "photos" && (
            <ReturnPhotosStep
              photos={photos}
              setPhotos={setPhotos}
              onDone={() => setStep("condition")}
            />
          )}

          {step === "condition" && (
            <ConditionStep
              conditions={conditions}
              setConditions={setConditions}
              onDone={() => {
                const hasIssues = Object.values(conditions).some((v) => v === "issue");
                setHasIncident(hasIssues);
                setStep(hasIssues ? "incident" : "sanitization");
              }}
            />
          )}

          {step === "incident" && (
            <IncidentStep
              onSubmit={async (data) => {
                if (!returnId) return;
                setLoading(true);
                try {
                  await returnApi.createIncident(returnId, data);
                  setStep("sanitization");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "sanitization" && (
            <SanitizationStep
              onSubmit={async (items) => {
                if (!returnId) return;
                setLoading(true);
                try {
                  await returnApi.sanitization(returnId, { completed: items });
                  setStep("finalize");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "finalize" && (
            <FinalizeStep
              onFinalize={async () => {
                if (!returnId) return;
                setLoading(true);
                try {
                  await returnApi.finalize(returnId);
                  navigate("/");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
              hasIncident={hasIncident}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-steps ---

function ScanDeviceStep({
  onScanned,
  loading,
}: {
  onScanned: (imei: string) => void;
  loading: boolean;
}) {
  const containerId = "qr-reader-return";
  const [useManual, setUseManual] = useState(false);
  const [imei, setImei] = useState("");

  useEffect(() => {
    if (useManual) return;
    const scanner = new Html5Qrcode(containerId);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        (text) => {
          scanner.stop().catch(() => {});
          try {
            const parsed = JSON.parse(text);
            onScanned(parsed.imei ?? text);
          } catch {
            onScanned(text);
          }
        },
        () => {},
      )
      .catch(() => setUseManual(true));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScanned, useManual]);

  if (useManual) {
    return (
      <Card variant="outlined" padding={32} className="flex flex-col gap-24">
        <ScanLine size={48} className="text-ink-400 mx-auto" />
        <p className="body text-ink-700 text-center">Введите IMEI устройства</p>
        <input
          value={imei}
          onChange={(e) => setImei(e.target.value)}
          placeholder="IMEI"
          className="w-full body p-12 border border-ink-200 rounded-12 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onScanned(imei)}
          loading={loading}
          disabled={!imei.trim()}
        >
          Подтвердить
        </Button>
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <ScanLine size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">Отсканируйте QR/штрихкод устройства</p>
      <div
        id={containerId}
        className="w-full max-w-[400px] aspect-square rounded-12 overflow-hidden"
      />
      <Button variant="ghost" size="lg" onClick={() => setUseManual(true)}>
        Ввести вручную
      </Button>
    </Card>
  );
}

function ShowQrStep({
  returnId,
  qrUrl,
  setQrUrl,
  onClientConfirmed,
  setError,
}: {
  returnId: string;
  qrUrl: string | null;
  setQrUrl: (url: string) => void;
  onClientConfirmed: () => void;
  setError: (e: string) => void;
}) {
  useEffect(() => {
    if (qrUrl) return;
    (async () => {
      try {
        const res = await returnApi.qr(returnId);
        setQrUrl(res.qr_url);
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [returnId, qrUrl, setQrUrl, setError]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await returnApi.status(returnId);
        if (res.client_confirmed) {
          clearInterval(id);
          onClientConfirmed();
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(id);
  }, [returnId, onClientConfirmed]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <QrCode size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Попросите клиента отсканировать QR для подтверждения возврата
      </p>
      {qrUrl ? (
        <div className="p-16 bg-white rounded-16 shadow-elev-1">
          <img src={qrUrl} alt="QR возврата" className="w-[240px] h-[240px]" />
        </div>
      ) : (
        <Spinner size={32} />
      )}
      <div className="flex items-center gap-8 text-ink-400">
        <Spinner size={16} />
        <span className="body-sm">Ожидание подтверждения клиента...</span>
      </div>
    </Card>
  );
}

function FrpCheckStep({
  onCheck,
  loading,
}: {
  onCheck: (cleared: boolean) => void;
  loading: boolean;
}) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <ShieldCheck size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Проверьте, что Factory Reset Protection (FRP) отключён.
        Зайдите в Настройки &rarr; Аккаунты и убедитесь, что Google-аккаунт клиента удалён.
      </p>
      <div className="grid grid-cols-2 gap-12 w-full">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onCheck(true)}
          loading={loading}
        >
          FRP отключён
        </Button>
        <Button
          variant="destructive"
          size="lg"
          fullWidth
          onClick={() => onCheck(false)}
          loading={loading}
        >
          FRP активен
        </Button>
      </div>
    </Card>
  );
}

function CompletenessStep({
  onSubmit,
  loading,
}: {
  onSubmit: (items: Record<string, boolean>) => void;
  loading: boolean;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHECKLIST_ITEMS.map((item) => [item, true])),
  );

  function toggle(item: string) {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <ClipboardCheck size={48} className="text-ink-400 mx-auto" />
      <p className="body text-ink-700 text-center">Проверьте комплектность</p>
      <div className="flex flex-col gap-12">
        {CHECKLIST_ITEMS.map((item) => (
          <label
            key={item}
            className="flex items-center gap-12 p-12 border border-ink-200 rounded-12 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked[item]}
              onChange={() => toggle(item)}
              className="w-24 h-24 rounded-8 accent-accent"
            />
            <span className="body text-ink-900">{item}</span>
          </label>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onSubmit(checked)}
        loading={loading}
      >
        Далее
      </Button>
    </Card>
  );
}

function ReturnPhotosStep({
  photos,
  setPhotos,
  onDone,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  onDone: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const currentIndex = photos.length;
  const allDone = photos.length >= PHOTO_LABELS.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1280, height: 960 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch {
        // camera unavailable
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.85);
    setPhotos([...photos, url]);
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <div className="flex items-center justify-between">
        <p className="body text-ink-700">
          {allDone
            ? "Все фото сделаны"
            : `Фото ${currentIndex + 1}/6: ${PHOTO_LABELS[currentIndex]}`}
        </p>
        <span className="caption text-ink-400">{photos.length}/6</span>
      </div>

      {!allDone && (
        <>
          <div className="relative w-full aspect-[4/3] bg-ink-100 rounded-12 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size={32} />
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={Camera}
            onClick={capture}
            disabled={!ready}
          >
            Сделать фото: {PHOTO_LABELS[currentIndex]}
          </Button>
        </>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-6 gap-8">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-8 overflow-hidden border border-ink-200">
              <img src={url} alt={PHOTO_LABELS[i]} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-ink-900/60 text-white caption text-center py-2">
                {PHOTO_LABELS[i]}
              </div>
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>
          Далее
        </Button>
      )}
    </Card>
  );
}

function ConditionStep({
  conditions,
  setConditions,
  onDone,
}: {
  conditions: Record<string, ConditionRating>;
  setConditions: (c: Record<string, ConditionRating>) => void;
  onDone: () => void;
}) {
  const ratings: ConditionRating[] = ["ok", "minor", "issue"];
  const ratingLabels: Record<ConditionRating, string> = {
    ok: "ОК",
    minor: "Мелкое",
    issue: "Проблема",
  };
  const ratingVariants: Record<ConditionRating, "success" | "warning" | "danger"> = {
    ok: "success",
    minor: "warning",
    issue: "danger",
  };

  function setRating(category: string, rating: ConditionRating) {
    setConditions({ ...conditions, [category]: rating });
  }

  const allRated = CONDITION_CATEGORIES.every((c) => conditions[c]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <p className="body text-ink-700 text-center">Оцените состояние каждого элемента</p>
      <div className="flex flex-col gap-12">
        {CONDITION_CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center justify-between p-12 border border-ink-200 rounded-12">
            <span className="body text-ink-900">{cat}</span>
            <div className="flex gap-8">
              {ratings.map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(cat, r)}
                  className={`px-16 py-8 rounded-full body-sm font-semibold transition-all ${
                    conditions[cat] === r
                      ? r === "ok"
                        ? "bg-accent text-accent-ink"
                        : r === "minor"
                          ? "bg-warning text-warning-ink"
                          : "bg-danger text-white"
                      : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {ratingLabels[r]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={onDone}
        disabled={!allRated}
      >
        Далее
      </Button>
    </Card>
  );
}

function IncidentStep({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { description: string; severity: string }) => void;
  loading: boolean;
}) {
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <AlertTriangle size={48} className="text-warning mx-auto" />
      <p className="body text-ink-700 text-center">Зафиксируйте инцидент</p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Опишите обнаруженные повреждения или проблемы..."
        className="w-full body p-12 border border-ink-200 rounded-12 bg-white text-ink-900 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div>
        <p className="body-sm text-ink-500 mb-8">Серьёзность</p>
        <div className="flex gap-8">
          {(["low", "medium", "high"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-20 py-10 rounded-full body-sm font-semibold transition-all ${
                severity === s
                  ? s === "low"
                    ? "bg-accent text-accent-ink"
                    : s === "medium"
                      ? "bg-warning text-warning-ink"
                      : "bg-danger text-white"
                  : "bg-ink-100 text-ink-500"
              }`}
            >
              {s === "low" ? "Низкая" : s === "medium" ? "Средняя" : "Высокая"}
            </button>
          ))}
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onSubmit({ description, severity })}
        loading={loading}
        disabled={!description.trim()}
      >
        Создать инцидент
      </Button>
    </Card>
  );
}

function SanitizationStep({
  onSubmit,
  loading,
}: {
  onSubmit: (items: string[]) => void;
  loading: boolean;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  const allChecked = SANITIZATION_ITEMS.every((item) => checked.has(item));

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <Sparkles size={48} className="text-ink-400 mx-auto" />
      <p className="body text-ink-700 text-center">Выполните санитарную обработку</p>
      <div className="flex flex-col gap-12">
        {SANITIZATION_ITEMS.map((item) => (
          <label
            key={item}
            className="flex items-center gap-12 p-12 border border-ink-200 rounded-12 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked.has(item)}
              onChange={() => toggle(item)}
              className="w-24 h-24 rounded-8 accent-accent"
            />
            <span className="body text-ink-900">{item}</span>
          </label>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onSubmit([...checked])}
        loading={loading}
        disabled={!allChecked}
      >
        Далее
      </Button>
    </Card>
  );
}

function FinalizeStep({
  onFinalize,
  loading,
  hasIncident,
}: {
  onFinalize: () => void;
  loading: boolean;
  hasIncident: boolean;
}) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CheckCircle size={48} className="text-accent" />
      <p className="h2 text-ink-900">Возврат готов к завершению</p>
      {hasIncident && (
        <Badge variant="warning" size="md">Есть инцидент</Badge>
      )}
      <p className="body text-ink-500 text-center">
        Все проверки выполнены. Нажмите для завершения приёма устройства.
      </p>
      <Button variant="primary" size="lg" fullWidth onClick={onFinalize} loading={loading}>
        Завершить возврат
      </Button>
    </Card>
  );
}
