import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  PenTool,
  QrCode,
  ScanLine,
  UserCheck,
} from "lucide-react";
import { Button, Card, Spinner, Logo, AppHeader } from "@deliphone/ui";
import { issueApi } from "@/api/partner";
import { Html5Qrcode } from "html5-qrcode";
import SignatureCanvas from "react-signature-canvas";

type Step =
  | "scan-client"
  | "identity"
  | "scan-device"
  | "photos"
  | "signature"
  | "finalize"
  | "done";

const STEP_LABELS: Record<Step, string> = {
  "scan-client": "Сканирование QR клиента",
  "identity": "Проверка личности",
  "scan-device": "Сканирование устройства",
  "photos": "Фото устройства",
  "signature": "Подпись клиента",
  "finalize": "Подтверждение выдачи",
  "done": "Выдача завершена",
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

export function IssueWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("scan-client");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
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

          {step === "scan-client" && (
            <ScanClientStep
              onScanned={async (qr) => {
                setLoading(true);
                setError(null);
                try {
                  const res = await issueApi.scanClientQr(qr);
                  setBookingId(res.booking_id);
                  setBookingData(res);
                  setStep("identity");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "identity" && bookingData && (
            <IdentityStep
              data={bookingData}
              onConfirm={async () => {
                if (!bookingId) return;
                setLoading(true);
                try {
                  await issueApi.confirmIdentity(bookingId);
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
                if (!bookingId) return;
                setLoading(true);
                setError(null);
                try {
                  await issueApi.scanDevice(bookingId, { imei, serial_number: serial });
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
                if (!bookingId) return;
                setLoading(true);
                try {
                  await issueApi.uploadPhotos(bookingId, photos);
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
                if (!bookingId) return;
                setSignatureUrl(url);
                setLoading(true);
                try {
                  await issueApi.clientSignature(bookingId, url);
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
                if (!bookingId) return;
                setLoading(true);
                try {
                  await issueApi.finalizeIssue(bookingId);
                  setStep("done");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
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

function ScanClientStep({
  onScanned,
  loading,
}: {
  onScanned: (qr: string) => void;
  loading: boolean;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-issue";

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        (text) => {
          scanner.stop().catch(() => {});
          onScanned(text);
        },
        () => {},
      )
      .catch(() => {});

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScanned]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <QrCode size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Попросите клиента показать QR-код из приложения
      </p>
      <div
        id={containerId}
        className="w-full max-w-[400px] aspect-square rounded-12 overflow-hidden"
      />
      {loading && (
        <div className="flex items-center gap-8">
          <Spinner size={16} />
          <span className="body-sm text-ink-400">Проверка...</span>
        </div>
      )}
    </Card>
  );
}

function IdentityStep({
  data,
  onConfirm,
  loading,
}: {
  data: any;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <UserCheck size={48} className="text-accent" />
      <p className="body text-ink-700 text-center">Сверьте данные с документом клиента</p>
      <div className="grid grid-cols-2 gap-16 w-full">
        {data.kyc_photo_url && (
          <img
            src={data.kyc_photo_url}
            alt="Фото из KYC"
            className="w-full rounded-12 object-cover aspect-[3/4]"
          />
        )}
        <div className="flex flex-col gap-8">
          <div className="body-sm text-ink-500">Имя</div>
          <div className="body text-ink-900">{data.client_name ?? "Не указано"}</div>
          <div className="body-sm text-ink-500 mt-8">Устройство</div>
          <div className="body text-ink-900">{data.device_model ?? "Не указано"}</div>
          <div className="body-sm text-ink-500 mt-8">Бронирование</div>
          <div className="body text-ink-900">#{data.booking_id?.slice(0, 8)}</div>
        </div>
      </div>
      <Button variant="primary" size="lg" fullWidth onClick={onConfirm} loading={loading}>
        Личность подтверждена
      </Button>
    </Card>
  );
}

function ScanDeviceStep({
  onScanned,
  loading,
}: {
  onScanned: (imei: string, serial: string) => void;
  loading: boolean;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-device";
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    if (useManual) return;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        (text) => {
          scanner.stop().catch(() => {});
          try {
            const parsed = JSON.parse(text);
            onScanned(parsed.imei ?? text, parsed.serial ?? "");
          } catch {
            onScanned(text, "");
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
        <p className="body text-ink-700 text-center">Введите IMEI и серийный номер устройства</p>
        <input
          value={imei}
          onChange={(e) => setImei(e.target.value)}
          placeholder="IMEI"
          className="w-full body p-12 border border-ink-200 rounded-12 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="Серийный номер"
          className="w-full body p-12 border border-ink-200 rounded-12 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onScanned(imei, serial)}
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
      {loading && (
        <div className="flex items-center gap-8">
          <Spinner size={16} />
          <span className="body-sm text-ink-400">Проверка...</span>
        </div>
      )}
    </Card>
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

      {/* Thumbnails */}
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

function FinalizeStep({
  onFinalize,
  loading,
}: {
  onFinalize: () => void;
  loading: boolean;
}) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CheckCircle size={48} className="text-accent" />
      <p className="h2 text-ink-900">Всё готово к выдаче</p>
      <p className="body text-ink-500 text-center">
        Фотографии загружены, подпись получена. Нажмите для завершения выдачи.
      </p>
      <Button variant="primary" size="lg" fullWidth onClick={onFinalize} loading={loading}>
        Завершить выдачу
      </Button>
    </Card>
  );
}

function DoneStep({ onBack }: { onBack: () => void }) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CheckCircle size={64} className="text-accent" />
      <p className="h1 text-ink-900">Устройство выдано</p>
      <p className="body text-ink-500 text-center">
        Выдача оформлена. Передайте устройство клиенту.
      </p>
      <Button variant="primary" size="lg" fullWidth onClick={onBack}>
        На главную
      </Button>
    </Card>
  );
}
