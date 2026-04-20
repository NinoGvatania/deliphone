import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, QrCode, UserCheck, CreditCard, Camera } from "lucide-react";
import { Button, Card, Spinner, Logo, AppHeader } from "@deliphone/ui";
import { registrationApi, kycProxyApi, type RegSession, type RegStatus } from "@/api/partner";

type Step =
  | "qr"
  | "client-attached"
  | "kyc-passport-front"
  | "kyc-passport-back"
  | "kyc-selfie"
  | "kyc-address"
  | "kyc-submit"
  | "card-binding"
  | "finish";

const STEP_LABELS: Record<Step, string> = {
  "qr": "QR-код для регистрации",
  "client-attached": "Клиент подключён",
  "kyc-passport-front": "Паспорт: разворот",
  "kyc-passport-back": "Паспорт: прописка",
  "kyc-selfie": "Селфи с паспортом",
  "kyc-address": "Адрес доставки",
  "kyc-submit": "Отправка данных",
  "card-binding": "Привязка карты",
  "finish": "Готово",
};

const STEPS = Object.keys(STEP_LABELS) as Step[];

export function RegistrationWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("qr");
  const [session, setSession] = useState<RegSession | null>(null);
  const [regStatus, setRegStatus] = useState<RegStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardQr, setCardQr] = useState<string | null>(null);

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

      {/* Progress bar */}
      <div className="h-4 bg-ink-100">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center px-24 py-24">
        <div className="w-full max-w-[600px]">
          <h1 className="h2 text-ink-900 mb-16">{STEP_LABELS[step]}</h1>

          {error && (
            <div className="body-sm text-danger mb-16">{error}</div>
          )}

          {step === "qr" && (
            <QrStep
              session={session}
              setSession={setSession}
              setRegStatus={setRegStatus}
              setUserId={setUserId}
              onNext={() => setStep("client-attached")}
              setError={setError}
            />
          )}

          {step === "client-attached" && (
            <ClientAttachedStep
              regStatus={regStatus}
              onNext={async () => {
                if (!userId) return;
                setLoading(true);
                try {
                  const res = await kycProxyApi.init(userId);
                  setSubmissionId(res.submission_id);
                  setStep("kyc-passport-front");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "kyc-passport-front" && (
            <PhotoCaptureStep
              label="Сфотографируйте разворот паспорта с фотографией"
              icon={Camera}
              onCapture={async (blob) => {
                if (!userId || !submissionId) return;
                setLoading(true);
                try {
                  await kycProxyApi.uploadFile(userId, submissionId, "passport_front", blob);
                  setStep("kyc-passport-back");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "kyc-passport-back" && (
            <PhotoCaptureStep
              label="Сфотографируйте страницу с пропиской"
              icon={Camera}
              onCapture={async (blob) => {
                if (!userId || !submissionId) return;
                setLoading(true);
                try {
                  await kycProxyApi.uploadFile(userId, submissionId, "passport_registration", blob);
                  setStep("kyc-selfie");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "kyc-selfie" && (
            <PhotoCaptureStep
              label="Попросите клиента сделать селфи с паспортом"
              icon={Camera}
              onCapture={async (blob) => {
                if (!userId || !submissionId) return;
                setLoading(true);
                try {
                  await kycProxyApi.uploadFile(userId, submissionId, "selfie_with_passport", blob);
                  setStep("kyc-address");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "kyc-address" && (
            <AddressStep
              onSubmit={async (address) => {
                if (!userId) return;
                setLoading(true);
                try {
                  await kycProxyApi.submit(userId, {
                    submission_id: submissionId,
                    address,
                  });
                  setStep("kyc-submit");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "kyc-submit" && (
            <KycSubmittedStep
              userId={userId!}
              onNext={async () => {
                if (!userId) return;
                setLoading(true);
                try {
                  const res = await kycProxyApi.cardBindingInit(userId);
                  setCardQr(res.confirmation_url);
                  setStep("card-binding");
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {step === "card-binding" && (
            <CardBindingStep
              qrUrl={cardQr}
              userId={userId!}
              onNext={() => setStep("finish")}
              setError={setError}
            />
          )}

          {step === "finish" && (
            <FinishStep onDone={() => navigate("/")} />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-steps ---

function QrStep({
  session,
  setSession,
  setRegStatus,
  setUserId,
  onNext,
  setError,
}: {
  session: RegSession | null;
  setSession: (s: RegSession) => void;
  setRegStatus: (r: RegStatus) => void;
  setUserId: (id: string) => void;
  onNext: () => void;
  setError: (e: string) => void;
}) {
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (session) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await registrationApi.create();
        if (!cancelled) setSession(s);
      } catch (err: any) {
        setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [session, setSession, setError]);

  useEffect(() => {
    if (!session) return;
    pollRef.current = setInterval(async () => {
      try {
        const st = await registrationApi.status(session.session_id);
        if (st.status === "attached" && st.user) {
          clearInterval(pollRef.current);
          setRegStatus(st);
          setUserId(st.user.id);
          onNext();
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [session, setRegStatus, setUserId, onNext]);

  if (!session) {
    return (
      <div className="flex items-center justify-center py-48">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <QrCode size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Попросите клиента отсканировать QR-код через Telegram
      </p>
      <div className="p-16 bg-white rounded-16 shadow-elev-1">
        <img
          src={session.qr_url}
          alt="QR-код регистрации"
          className="w-[240px] h-[240px]"
        />
      </div>
      <p className="body-sm text-ink-400">Или ссылка: {session.deep_link}</p>
      <div className="flex items-center gap-8 text-ink-400">
        <Spinner size={16} />
        <span className="body-sm">Ожидание подключения...</span>
      </div>
    </Card>
  );
}

function ClientAttachedStep({
  regStatus,
  onNext,
  loading,
}: {
  regStatus: RegStatus | null;
  onNext: () => void;
  loading: boolean;
}) {
  const user = regStatus?.user;
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <UserCheck size={48} className="text-accent" />
      <p className="h2 text-ink-900">Клиент подключён</p>
      {user && (
        <div className="flex items-center gap-12">
          {user.telegram_photo_url && (
            <img
              src={user.telegram_photo_url}
              alt=""
              className="w-48 h-48 rounded-full object-cover"
            />
          )}
          <div>
            <div className="body text-ink-900">
              {user.telegram_first_name ?? user.telegram_username ?? "Пользователь"}
            </div>
            {user.telegram_username && (
              <div className="body-sm text-ink-500">@{user.telegram_username}</div>
            )}
          </div>
        </div>
      )}
      <Button variant="primary" size="lg" fullWidth onClick={onNext} loading={loading}>
        Перейти к верификации (KYC)
      </Button>
    </Card>
  );
}

function PhotoCaptureStep({
  label,
  icon: IconComp,
  onCapture,
  loading,
}: {
  label: string;
  icon: any;
  onCapture: (blob: Blob) => void;
  loading: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

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
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/jpeg", 0.85);
  }

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <p className="body text-ink-700 text-center">{label}</p>
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
        icon={IconComp}
        onClick={capture}
        loading={loading}
        disabled={!ready}
      >
        Сделать фото
      </Button>
    </Card>
  );
}

function AddressStep({
  onSubmit,
  loading,
}: {
  onSubmit: (address: string) => void;
  loading: boolean;
}) {
  const [address, setAddress] = useState("");

  return (
    <Card variant="outlined" padding={32} className="flex flex-col gap-24">
      <p className="body text-ink-700">Введите адрес клиента (по паспорту)</p>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        rows={3}
        className="w-full body p-12 border border-ink-200 rounded-12 bg-white text-ink-900 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
      />
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onSubmit(address)}
        loading={loading}
        disabled={!address.trim()}
      >
        Отправить на проверку
      </Button>
    </Card>
  );
}

function KycSubmittedStep({
  userId,
  onNext,
  loading,
}: {
  userId: string;
  onNext: () => void;
  loading: boolean;
}) {
  const [checking, setChecking] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await kycProxyApi.clientStatus(userId);
        if (res.kyc_status === "approved" && !cancelled) {
          setApproved(true);
          setChecking(false);
          clearInterval(id);
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      {checking ? (
        <>
          <Spinner size={32} />
          <p className="body text-ink-700 text-center">Проверка документов...</p>
          <p className="body-sm text-ink-400 text-center">Обычно занимает 1-2 минуты</p>
        </>
      ) : (
        <>
          <CheckCircle size={48} className="text-accent" />
          <p className="h2 text-ink-900">KYC пройден</p>
          <Button variant="primary" size="lg" fullWidth onClick={onNext} loading={loading}>
            Привязать карту
          </Button>
        </>
      )}
    </Card>
  );
}

function CardBindingStep({
  qrUrl,
  userId,
  onNext,
  setError,
}: {
  qrUrl: string | null;
  userId: string;
  onNext: () => void;
  setError: (e: string) => void;
}) {
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await kycProxyApi.cardBindingStatus(userId);
        if (res.card_bound) {
          clearInterval(id);
          onNext();
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(id);
  }, [userId, onNext]);

  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CreditCard size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">
        Попросите клиента привязать карту через ЮKassa
      </p>
      {qrUrl && (
        <div className="p-16 bg-white rounded-16 shadow-elev-1">
          <img src={qrUrl} alt="QR привязка карты" className="w-[240px] h-[240px]" />
        </div>
      )}
      <div className="flex items-center gap-8 text-ink-400">
        <Spinner size={16} />
        <span className="body-sm">Ожидание привязки...</span>
      </div>
    </Card>
  );
}

function FinishStep({ onDone }: { onDone: () => void }) {
  return (
    <Card variant="outlined" padding={32} className="flex flex-col items-center gap-24">
      <CheckCircle size={64} className="text-accent" />
      <p className="h1 text-ink-900">Регистрация завершена</p>
      <p className="body text-ink-500 text-center">
        Клиент зарегистрирован, KYC пройден, карта привязана.
        Теперь можно выдать устройство.
      </p>
      <Button variant="primary" size="lg" fullWidth onClick={onDone}>
        На главную
      </Button>
    </Card>
  );
}
