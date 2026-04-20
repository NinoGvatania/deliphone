import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Spinner } from "@deliphone/ui";
import { QrCode, X } from "lucide-react";

export function ActivationScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // If activation_token is already in URL, go directly to pay
  useEffect(() => {
    const token = searchParams.get("activation_token");
    if (token) {
      navigate(`/activate/pay?token=${encodeURIComponent(token)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1280, height: 720 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Use BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
          scanInterval.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                handleQrResult(barcodes[0].rawValue);
              }
            } catch {
              // detection failed, retry
            }
          }, 300);
        }
      } catch {
        setError("Не удалось получить доступ к камере");
        setScanning(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  function handleQrResult(text: string) {
    setScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (scanInterval.current) clearInterval(scanInterval.current);

    // Extract payment_token from QR URL
    try {
      const url = new URL(text);
      const token = url.searchParams.get("token") || url.searchParams.get("payment_token");
      if (token) {
        navigate(`/activate/pay?token=${encodeURIComponent(token)}`, { replace: true });
        return;
      }
    } catch {
      // not a URL, try raw token
    }

    // Try raw token value
    if (text.length > 10) {
      navigate(`/activate/pay?token=${encodeURIComponent(text)}`, { replace: true });
    } else {
      setError("QR-код не распознан. Попробуй снова.");
      setScanning(true);
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      {/* Close button */}
      <div className="absolute top-16 right-16 z-20">
        <button
          onClick={() => navigate("/")}
          className="w-40 h-40 rounded-full bg-ink-0/20 flex items-center justify-center"
        >
          <X size={20} className="text-ink-0" />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Scan frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="border-2 border-accent rounded-16"
            style={{ width: 250, height: 250 }}
          />
        </div>

        {scanning && (
          <div className="absolute bottom-32 inset-x-0 flex justify-center">
            <div className="bg-ink-900/80 px-20 py-12 rounded-full flex items-center gap-12">
              <QrCode size={18} className="text-accent" />
              <span className="body-sm text-ink-0">Наведи на QR-код партнёра</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-20 py-16 bg-ink-0">
          <p className="body-sm text-danger text-center m-0">{error}</p>
        </div>
      )}
    </div>
  );
}
