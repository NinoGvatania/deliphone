import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppHeader, Logo, Button } from "@deliphone/ui";
import { AlertCircle } from "lucide-react";
import { kycApi } from "@/api/kyc";

export function KycRejectedPage() {
  const navigate = useNavigate();
  const [resubmitting, setResubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => kycApi.getStatus(),
  });

  const handleResubmit = async () => {
    if (!data?.submission_id) return;
    setResubmitting(true);
    try {
      await kycApi.resubmit(data.submission_id);
      navigate("/kyc", { replace: true });
    } finally {
      setResubmitting(false);
    }
  };

  const reason =
    data?.rejection_reason || data?.reviewer_comment || "Документы не прошли проверку";

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader left={<Logo size="sm" />} />

      <main className="flex-1 flex flex-col items-center justify-center px-16 gap-24">
        <div className="w-64 h-64 rounded-full bg-danger/10 flex items-center justify-center">
          <AlertCircle size={32} className="text-danger" />
        </div>

        <h1 className="h1 text-center">Верификация не пройдена</h1>
        <p className="body text-ink-600 text-center">{reason}</p>

        {data?.resubmit_requested_files && data.resubmit_requested_files.length > 0 && (
          <div className="w-full bg-ink-100 rounded-lg p-16">
            <p className="body-sm text-ink-700 font-medium mb-8">Нужно переснять:</p>
            <ul className="list-disc pl-16">
              {data.resubmit_requested_files.map((f) => (
                <li key={f} className="body-sm text-ink-600">
                  {f === "passport_main" && "Основной разворот паспорта"}
                  {f === "passport_reg" && "Страница прописки"}
                  {f === "selfie" && "Селфи с паспортом"}
                  {f === "video" && "Видео"}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={resubmitting}
          onClick={handleResubmit}
        >
          Попробовать снова
        </Button>
      </main>
    </div>
  );
}
