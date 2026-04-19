import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Logo, Badge } from "@deliphone/ui";
import { ArrowLeft } from "lucide-react";
import { kycApi, type KycInitResponse } from "@/api/kyc";
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
  const navigate = useNavigate();
  const stepIndex = STEPS.indexOf(step);

  const handleInit = async () => {
    const data = await kycApi.init();
    setInitData(data);
    setStep("passport_main");
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

  const handleComplete = () => navigate("/kyc/pending");

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
          stepIndex > 0 ? (
            <Badge variant="neutral" size="sm">
              Шаг {stepIndex} из {STEPS.length - 1}
            </Badge>
          ) : undefined
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
        {step === "intro" && <KycIntroStep onStart={handleInit} />}
        {step === "passport_main" && initData && (
          <KycPhotoStep
            fileType="passport_main"
            uploadUrl={initData.upload_urls["passport_main"]!}
            title="Основной разворот паспорта"
            instruction="Положи паспорт на ровную поверхность, открой на развороте с фото"
            onUploaded={() => handlePhotoUploaded("passport_main")}
          />
        )}
        {step === "passport_reg" && initData && (
          <KycPhotoStep
            fileType="passport_reg"
            uploadUrl={initData.upload_urls["passport_reg"]!}
            title="Страница прописки"
            instruction="Открой паспорт на развороте с пропиской"
            onUploaded={() => handlePhotoUploaded("passport_reg")}
          />
        )}
        {step === "selfie" && initData && (
          <KycSelfieStep uploadUrl={initData.upload_urls["selfie"]!} onUploaded={handleSelfieUploaded} />
        )}
        {step === "video" && initData && (
          <KycVideoStep uploadUrl={initData.upload_urls["video"]!} onUploaded={handleVideoUploaded} />
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
