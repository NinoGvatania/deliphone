/**
 * QR Scanner component that properly cleans up camera on unmount.
 * Uses html5-qrcode with try/catch for all lifecycle methods.
 */
import { useEffect, useRef, useState } from "react";
import { Button, Card, Spinner } from "@deliphone/ui";
import { QrCode } from "lucide-react";

type Props = {
  onScanned: (text: string) => void;
  label?: string;
  placeholder?: string;
};

export function QrScanner({ onScanned, label = "Сканируйте QR-код", placeholder = "ID или QR-код" }: Props) {
  const containerId = useRef(`qr-${Math.random().toString(36).slice(2, 8)}`).current;
  const scannerRef = useRef<any>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let scanner: any = null;

    async function init() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mountedRef.current) return;

        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (text: string) => {
            try { scanner.stop(); } catch {}
            scannerRef.current = null;
            onScanned(text);
          },
          () => {},
        );
      } catch {
        if (mountedRef.current) setCameraFailed(true);
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      const s = scannerRef.current;
      if (s) {
        try {
          const state = s.getState?.();
          if (state === 2 || state === 3) { // SCANNING or PAUSED
            s.stop().catch(() => {});
          }
        } catch {
          try { s.stop().catch(() => {}); } catch {}
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <Card variant="outlined" padding={32} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <QrCode size={48} className="text-ink-400" />
      <p className="body text-ink-700 text-center">{label}</p>

      {!cameraFailed && (
        <div
          id={containerId}
          style={{ width: "100%", maxWidth: 400, aspectRatio: "1", borderRadius: 12, overflow: "hidden" }}
        />
      )}

      {cameraFailed && (
        <p className="body-sm text-ink-500 text-center">Камера недоступна — введите вручную</p>
      )}

      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 400 }}>
        <input
          type="text"
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, height: 48, padding: "0 16px",
            border: "1px solid #E3E3DF", borderRadius: 14,
            fontSize: 15, outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && manualValue.trim()) onScanned(manualValue.trim());
          }}
        />
        <Button
          variant="primary"
          size="md"
          disabled={!manualValue.trim()}
          onClick={() => onScanned(manualValue.trim())}
        >
          Найти
        </Button>
      </div>
    </Card>
  );
}
