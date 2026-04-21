import { MapPin } from "lucide-react";
import { Card } from "@deliphone/ui";

export function HomePage() {
  return (
    <div className="px-16 py-20">
      <h1 className="h2 m-0 mb-16">Карта точек</h1>
      <Card variant="filled" padding={32}>
        <div className="flex flex-col items-center gap-12 text-center py-32">
          <MapPin size={40} className="text-ink-400" />
          <p className="body text-ink-500 m-0">
            Здесь будет карта с маркерами точек
          </p>
        </div>
      </Card>
    </div>
  );
}
