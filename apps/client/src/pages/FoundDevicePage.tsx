import { useParams } from "react-router-dom";
import { Logo, Card } from "@deliphone/ui";
import { MapPin, Phone, Gift } from "lucide-react";

export function FoundDevicePage() {
  const { code } = useParams<{ code: string }>();
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-16 py-32">
      <Logo size="lg" />
      <Card variant="elevated" padding={32} style={{ maxWidth: 440, width: "100%", marginTop: 32 }}>
        <div className="flex flex-col items-center text-center gap-16">
          <div style={{ width: 64, height: 64, borderRadius: 999, background: "#D6FF3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift size={28} color="#0F1410" />
          </div>
          <h1 className="h2 m-0">Это устройство в аренде</h1>
          <p className="body text-ink-500 m-0">
            Устройство #{code} принадлежит сервису Делифон.
          </p>
          <div style={{ background: "#F1FFB5", borderRadius: 14, padding: "16px 20px", width: "100%" }}>
            <p className="body font-semibold m-0" style={{ color: "#0F1410" }}>
              Верни в любую точку сети — получишь 500 ₽
            </p>
          </div>
          <div className="flex items-center gap-8 body-sm text-ink-500">
            <MapPin size={16} /> Найди ближайшую точку на карте
          </div>
        </div>
      </Card>
    </div>
  );
}
