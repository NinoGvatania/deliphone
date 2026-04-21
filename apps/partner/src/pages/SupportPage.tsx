import { MessageCircle } from "lucide-react";
import { Card } from "@deliphone/ui";

export function SupportPage() {
  return (
    <div className="flex flex-col gap-24">
      <h1 className="h2 text-ink-900">Поддержка</h1>

      <Card variant="outlined" padding={32} className="flex flex-col items-center gap-16">
        <MessageCircle size={48} className="text-ink-300" />
        <p className="body text-ink-500 text-center">
          Чат с поддержкой будет доступен в ближайшем обновлении
        </p>
        <p className="body-sm text-ink-400 text-center">
          По срочным вопросам пишите на support@deliphone.ru
        </p>
      </Card>
    </div>
  );
}
