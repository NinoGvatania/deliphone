import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Logo, Badge, Spinner } from "@deliphone/ui";
import { ArrowLeft, X } from "lucide-react";
import { kycApi, type KycInitResponse } from "@/api/kyc";
import { useAuthStore } from "@/stores/auth";
import { KycIntroStep } from "./steps/KycIntroStep";
import { KycPhotoStep } from "./steps/KycPhotoStep";
import { KycSelfieStep } from "./steps/KycSelfieStep";
import { KycVideoStep } from "./steps/KycVideoStep";
import { KycDataStep, type KycFormData } from "./steps/KycDataStep";
import { KycConsentsStep } from "./steps/KycConsentsStep";

const STEPS = ["intro", "passport_main", "passport_reg", "selfie", "video", "data", "consents"] as const;
type Step = (typeof STEPS)[number];

export function KycFlowPage() {
  const [step, setStep] = useState<Step>("intro");
  const [initData, setInitData] = useState<KycInitResponse | null>(null);
  const [formData, setFormData] = useState<KycFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const stepIndex = STEPS.indexOf(step);

  // On mount: check current KYC status, redirect or resume
  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setLoading(true);
    try {
      const status = await kycApi.getStatus();

      if (!status.submission_id) {
        // No submission at all — show intro
        setStep("intro");
      } else if (status.status === "pending") {
        navigate("/kyc/pending", { replace: true });
        return;
      } else if (status.status === "approved") {
        navigate("/", { replace: true });
        return;
      } else if (status.status === "rejected") {
        navigate("/kyc/rejected", { replace: true });
        return;
      } else if (status.status === "resubmit_requested") {
        navigate("/kyc/rejected", { replace: true });
        return;
      } else if (status.status === "draft") {
        // Has a draft — need fresh upload URLs, re-init
        // (presigned URLs expire, so we re-fetch them)
        await doInit();
        return;
      } else {
        setStep("intro");
      }
    } catch {
      // API error (no submission yet, or network issue) — show intro
      setStep("intro");
    } finally {
      setLoading(false);
    }
  }

  async function doInit() {
    setError(null);
    try {
      const data = await kycApi.init();
      setInitData(data);
      setStep("passport_main");
    } catch (e: any) {
      if (e.status === 409) {
        // Already exists — fetch status and redirect
        try {
          const status = await kycApi.getStatus();
          if (status.status === "pending") navigate("/kyc/pending", { replace: true });
          else if (status.status === "rejected") navigate("/kyc/rejected", { replace: true });
          else if (status.status === "approved") navigate("/", { replace: true });
          else setError("Заявка уже создана. Обнови страницу.");
        } catch {
          setError("Заявка уже создана.");
        }
      } else {
        setError(e.message || "Ошибка инициализации");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleInit = async () => {
    setLoading(true);
    await doInit();
  };

  const handlePhotoUploaded = (fileType: string) => {
    if (fileType === "passport_main") setStep("passport_reg");
    else if (fileType === "passport_reg") setStep("selfie");
  };

  const handleSelfieUploaded = () => setStep("video");
  const handleVideoUploaded = () => setStep("data");
  const handleDataCollected = (data: KycFormData) => {
    setFormData(data);
    setStep("consents");
  };
  const handleComplete = () => navigate("/kyc/pending", { replace: true });

  if (loading && step === "intro") {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader
        left={
          stepIndex > 0 ? (
            <button onClick={() => setStep(STEPS[stepIndex - 1]!)} className="p-4">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Logo size="sm" />
          )
        }
        right={
          <div className="flex items-center gap-8">
            {stepIndex > 0 && (
              <Badge variant="neutral" size="sm">
                Шаг {stepIndex} из {STEPS.length - 1}
              </Badge>
            )}
            <button onClick={() => navigate("/profile")} className="p-4 text-ink-500" aria-label="Закрыть">
              <X size={20} />
            </button>
          </div>
        }
      />
      {stepIndex > 0 && (
        <div className="h-4 bg-ink-100">
          <div
            className="h-full bg-accent transition-all duration-base"
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      )}

      <main className="flex-1 px-16 py-24 max-w-[480px] mx-auto w-full">
        {error && (
          <div className="mb-16 p-12 bg-danger-bg text-danger body-sm rounded-lg">
            {error}
          </div>
        )}
        {step === "intro" && <KycIntroStep onStart={handleInit} />}
        {step === "passport_main" && initData && (
          <KycPhotoStep
            fileType="passport_main"
            submissionId={initData.submission_id}
            title="Основной разворот паспорта"
            instruction="Положи паспорт на ровную поверхность, открой на развороте с фото"
            onUploaded={() => handlePhotoUploaded("passport_main")}
          />
        )}
        {step === "passport_reg" && initData && (
          <KycPhotoStep
            fileType="passport_reg"
            submissionId={initData.submission_id}
            title="Страница прописки"
            instruction="Открой паспорт на развороте с пропиской"
            onUploaded={() => handlePhotoUploaded("passport_reg")}
          />
        )}
        {step === "selfie" && initData && (
          <KycSelfieStep submissionId={initData.submission_id} onUploaded={handleSelfieUploaded} />
        )}
        {step === "video" && initData && (
          <KycVideoStep submissionId={initData.submission_id} onUploaded={handleVideoUploaded} />
        )}
        {step === "data" && <KycDataStep onCollected={handleDataCollected} />}
        {step === "consents" && initData && formData && (
          <KycConsentsStep
            submissionId={initData.submission_id}
            formData={formData}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  );
}
