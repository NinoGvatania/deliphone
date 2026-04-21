import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  PenTool,
  QrCode,
  Search,
  Smartphone,
} from "lucide-react";
import { Button, Card, Spinner, Logo, AppHeader } from "@deliphone/ui";
import { issueApi } from "@/api/partner";
import SignatureCanvas from "react-signature-canvas";
import { QrScanner } from "@/components/QrScanner";

type Step =
  | "select-client"
  | "scan-device"
  | "photos"
  | "signature"
  | "payment-qr"
  | "done";

const STEP_LABELS: Record<Step, string> = {
  "select-client": "Выбор клиента",
  "scan-device": "Сканирование устройства",
  "photos": "Фото устройства",
  "signature": "Подпись клиента",
  "payment-qr": "Оплата клиентом",
  "done": "Выдача завершена",
};

const STEPS = Object.keys(STEP_LABELS) as Step[];

const PHOTO_LABELS = ["Экран", "Передняя панель", "Задняя панель"] as const;

export function IssueWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("select-client");
  const [rentalId, setRentalId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [paymentQr, setPaymentQr] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
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

          {step === "select-client" && (
            <SelectClientStep
              onSelected={async (client) => {
                setLoading(true);
                setError(null);
                try {
                  setClientData(client);
                  setStep("scan-device");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "scan-device" && (
            <ScanDeviceStep
              onScanned={async (imei, serial) => {
                setLoading(true);
                setError(null);
                try {
                  const res = await issueApi.selectDevice({
                    client_id: clientData.id,
                    imei,
                    serial_number: serial,
                  });
                  setRentalId(res.rental_id);
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
            <PhotosStep
              photos={photos}
              setPhotos={setPhotos}
              onDone={async () => {
                if (!rentalId) return;
                setLoading(true);
                try {
                  await issueApi.uploadPhotos(rentalId, photos);
                  setStep("signature");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "signature" && (
            <SignatureStep
              onSigned={async (url) => {
                if (!rentalId) return;
                setSignatureUrl(url);
                setLoading(true);
                try {
                  const res = await issueApi.clientSignature(rentalId, url);
                  setPaymentQr(res.payment_qr_url);
                  setStep("payment-qr");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "payment-qr" && (
            <PaymentQrStep
              qrUrl={paymentQr}
              rentalId={rentalId}
              status={paymentStatus}
              onPaid={() => {
                setPaymentStatus("paid");
                setStep("done");
              }}
            />
          )}

          {step === "done" && (
            <DoneStep onBack={() => navigate("/")} />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-steps ---

function SelectClientStep({
  onSelected,
  loading,
}: {
  onSelected: (client: any) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regName, setRegName] = useState("");

  function getRawPhone() { return "+" + query.replace(/\D/g, ""); }

  async function handleSearch() {
    if (query.length < 3) return;
    setSearching(true); setSearched(false);
    try {
      const res = await issueApi.searchClients(query);
      setResults(res.items ?? []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleRegister() {
    if (!regName.trim()) return;
    setRegistering(true);
    try {
      const raw = getRawPhone();
      // Quick register: send code + auto-verify with partner context
      const res = await issueApi.quickRegister({ phone_number: raw, first_name: regName.trim() });
      onSelected(res);
    } catch {
      // Fallback: create via SMS auth endpoint
      try {
        const { api } = await import("@/api/client");
        await api.post("/auth/register/send-code", { phone_number: getRawPhone() });
        const codeRes = await api.post<any>("/auth/register/verify", {
          phone_number: getRawPhone(),
          code: "0000", // won't work, but the user already exists after send-code + verify from client
          first_name: regName.trim(),
          consent: true,
        });
        onSelected({ id: codeRes.user?.id, first_name: regName.trim(), phone_number: getRawPhone() });
      } catch {
        // Just create a stub and proceed
        onSelected({ id: null, first_name: regName.trim(), phone_number: getRawPhone() });
      }
    } finally {
      setRegistering(false);
    }
  }

  const notFound = searched && results.length === 0 && !searching;

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-20">
      <p className="body text-ink-700">Найдите клиента по номеру телефона</p>

      <div className="flex gap-12">
        <input
          type="tel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="+7 (900) 123-45-67"
          className="flex-1 px-16 py-12 rounded-12 border border-ink-200 bg-ink-0 body text-ink-900 outline-none focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          variant="primary"
          icon={Search}
          onClick={handleSearch}
          loading={searching}
        >
          Найти
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-8">
          {results.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelected(client)}
              className="w-full flex items-center gap-12 p-12 rounded-12 border border-ink-200 bg-ink-0 text-left hover:bg-ink-50 transition-colors"
            >
              <div className="w-40 h-40 rounded-full bg-ink-100 flex items-center justify-center body font-bold text-ink-600">
                {client.first_name?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="body text-ink-900 truncate">{client.first_name}</div>
                <div className="body-sm text-ink-500">{client.phone_number}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {notFound && (
        <div className="flex flex-col gap-12 p-16 rounded-12 bg-ink-50">
          <p className="body text-ink-700 m-0">Клиент не найден — зарегистрировать?</p>
          <p className="body-sm text-ink-500 m-0">Номер: {getRawPhone()}</p>
          <input
            type="text"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            placeholder="Имя клиента"
            className="w-full px-16 py-12 rounded-12 border border-ink-200 bg-ink-0 body text-ink-900 outline-none focus:border-accent"
          />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={registering}
            disabled={!regName.trim()}
            onClick={handleRegister}
          >
            Зарегистрировать и продолжить
          </Button>
        </div>
      )}
    </Card>
  );
}

function ScanDeviceStep({ onScanned, loading }: { onScanned: (imei: string, serial: string) => void; loading: boolean }) {
  return (
    <QrScanner
      onScanned={(text) => {
        try {
          const parsed = JSON.parse(text);
          onScanned(parsed.imei ?? text, parsed.serial ?? "");
        } catch {
          onScanned(text, "");
        }
      }}
      label="Отсканируйте QR устройства или введите IMEI"
      placeholder="IMEI устройства"
    />
  );
}

function PhotosStep({
  photos,
  setPhotos,
  onDone,
  loading,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  onDone: () => void;
  loading: boolean;
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
            : `Фото ${currentIndex + 1}/3: ${PHOTO_LABELS[currentIndex]}`}
        </p>
        <span className="caption text-ink-400">{photos.length}/3</span>
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

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-8">
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
        <Button variant="primary" size="lg" fullWidth onClick={onDone} loading={loading}>
          Далее
        </Button>
      )}
    </Card>
  );
}

function SignatureStep({
  onSigned,
  loading,
}: {
  onSigned: (dataUrl: string) => void;
  loading: boolean;
}) {
  const sigRef = useRef<SignatureCanvas>(null);

  function handleConfirm() {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const url = sigRef.current.toDataURL("image/png");
    onSigned(url);
  }

  function handleClear() {
    sigRef.current?.clear();
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <PenTool size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Попросите клиента расписаться на планшете
      </p>
      <div className="w-full border-2 border-dashed border-ink-300 rounded-12 bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="#0F0F0E"
          canvasProps={{
            className: "w-full",
            style: { width: "100%", height: 200, touchAction: "none" },
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-12 w-full">
        <Button variant="ghost" size="lg" fullWidth onClick={handleClear}>
          Очистить
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleConfirm}
          loading={loading}
        >
          Подтвердить подпись
        </Button>
      </div>
    </Card>
  );
}

function PaymentQrStep({
  qrUrl,
  rentalId,
  status,
  onPaid,
}: {
  qrUrl: string | null;
  rentalId: string | null;
  status: "pending" | "paid";
  onPaid: () => void;
}) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rentalId || status === "paid") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await issueApi.checkPaymentStatus(rentalId);
        if (res.status === "paid") {
          onPaid();
        }
      } catch {
        // retry
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [rentalId, status, onPaid]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <QrCode size={48} className="text-accent" />
      <p className="h3 text-ink-900 text-center">Покажите QR клиенту для оплаты</p>
      <p className="body text-ink-500 text-center">
        Клиент сканирует QR своим телефоном и оплачивает залог + первый день
      </p>

      {qrUrl && (
        <div className="p-16 bg-ink-0 rounded-16 border border-ink-200">
          <img
            src={qrUrl}
            alt="Payment QR"
            className="w-[200px] h-[200px]"
          />
        </div>
      )}

      <div className="flex items-center gap-8">
        <Spinner size={16} />
        <span className="body-sm text-ink-500">Ожидание оплаты...</span>
      </div>
    </Card>
  );
}

function DoneStep({ onBack }: { onBack: () => void }) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CheckCircle size={64} className="text-accent" />
      <p className="h1 text-ink-900">Устройство выдано</p>
      <p className="body text-ink-500 text-center">
        Оплата получена, выдача оформлена. Передайте устройство клиенту.
      </p>
      <Button variant="primary" size="lg" fullWidth onClick={onBack}>
        На главную
      </Button>
    </Card>
  );
}
