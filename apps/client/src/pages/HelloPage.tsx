import { ArrowRight } from "lucide-react";
import { AppHeader, Button, Logo } from "@deliphone/ui";

/**
 * Онбординг клиента (SPEC §5.3, первый запуск).
 * Будет разбит на 3 шага в Фазе 2 — пока один экран со стартом.
 */
export function HelloPage() {
  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader left={<Logo size="md" />} />

      <main className="flex-1 flex items-center justify-center px-20 py-32">
        <section className="w-full max-w-[440px] flex flex-col gap-24">
          <header>
            <h1 className="h1 m-0 text-ink-900">Арендуй рабочий смартфон</h1>
            <p className="body-lg text-ink-500 mt-12 m-0">
              От 349 ₽ в сутки. Забирай в ближайшей точке, сдавай где удобно.
            </p>
          </header>

          <div className="flex flex-col gap-12">
            <Button variant="primary" size="lg" iconRight={ArrowRight} fullWidth>
              Начать
            </Button>
            <Button variant="link" size="lg">
              Уже есть аккаунт
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
