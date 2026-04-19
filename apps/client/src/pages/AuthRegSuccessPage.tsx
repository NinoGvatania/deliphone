import { Logo, Card } from "@deliphone/ui";
import { CheckCircle } from "lucide-react";

export function AuthRegSuccessPage() {
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div className="w-48 h-48 rounded-full bg-accent flex items-center justify-center">
              <CheckCircle size={24} className="text-accent-ink" />
            </div>
            <h1 className="h2 m-0">Готово</h1>
            <p className="body text-ink-500 m-0">
              Ты подключился к регистрации. Оператор продолжит оформление на
              своём устройстве.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
