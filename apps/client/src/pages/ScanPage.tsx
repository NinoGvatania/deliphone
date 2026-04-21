import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Logo, Spinner } from "@deliphone/ui";
import { X } from "lucide-react";

export function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerInstance = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode("qr-reader");
        scannerInstance.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            scanner.stop().catch(() => {});
            // QR contains location ID or short code
            // Format: deliphone://rent/{locationId} or just the ID
            const match = text.match(/rent\/([a-f0-9-]+)/i);
            const locationId = match ? match[1] : text;
            navigate(`/rent/${locationId}`, { replace: true });
          },
          () => {},
        );
      } catch {
        if (mounted) setError("Не удалось открыть камеру для сканирования");
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scannerInstance.current?.stop().catch(() => {});
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      <AppHeader
        left={<Logo size="sm" tone="light" />}
        right={
          <button onClick={() => navigate(-1)} className="text-ink-400 p-4">
            <X size={20} />
          </button>
        }
        style={{ background: "transparent", borderBottom: "none" }}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-16 gap-24">
        <div
          id="qr-reader"
          ref={scannerRef}
          className="w-full max-w-[300px] aspect-square rounded-lg overflow-hidden"
        />

        {error ? (
          <p className="body text-danger text-center">{error}</p>
        ) : (
          <div className="text-center">
            <p className="body text-ink-0 m-0">Наведи камеру на QR-код</p>
            <p className="body-sm text-ink-500 m-0 mt-4">
              QR-код находится на стойке в точке выдачи
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
