import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppHeader, Logo, Spinner } from "@deliphone/ui";
import { kycApi } from "@/api/kyc";

export function KycPendingPage() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => kycApi.getStatus(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    if (data.status === "approved") {
      navigate("/", { replace: true });
    } else if (data.status === "rejected") {
      navigate("/kyc/rejected", { replace: true });
    } else if (data.status === "resubmit_requested") {
      navigate("/kyc/rejected", { replace: true });
    }
  }, [data, navigate]);

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader left={<Logo size="sm" />} />

      <main className="flex-1 flex flex-col items-center justify-center px-16 gap-24">
        <Spinner size={48} />
        <h1 className="h1 text-center">Проверяем документы</h1>
        <p className="body text-ink-500 text-center">Обычно это занимает до 30 минут</p>
        <p className="caption text-ink-400 text-center">
          Мы пришлём уведомление, когда проверка будет завершена.
          Можешь закрыть приложение.
        </p>
      </main>
    </div>
  );
}
