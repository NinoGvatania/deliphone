import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Button, Card, Input, Logo } from "@deliphone/ui";
import { ArrowLeft, Mail } from "lucide-react";
import { paymentsApi } from "@/api/payments";

export function EmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await paymentsApi.setEmail(email);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(-1);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col">
        <AppHeader left={<Logo size="sm" />} />
        <main className="flex-1 flex items-center justify-center px-16">
          <Card variant="elevated" padding={32}>
            <div className="flex flex-col items-center gap-16 text-center">
              <div className="w-48 h-48 rounded-full bg-success-bg flex items-center justify-center">
                <Mail size={24} className="text-success" />
              </div>
              <h2 className="h2 m-0">Email сохранён</h2>
              <p className="body text-ink-500 m-0">
                Чеки будут приходить на {email}
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => navigate(-1)}>
                Готово
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <AppHeader
        left={
          <button onClick={() => navigate(-1)} className="p-4">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <main className="flex-1 px-16 py-24 max-w-[480px] mx-auto w-full">
        <h1 className="h1 m-0">Email для чеков</h1>
        <p className="body-lg text-ink-500 mt-8 m-0">
          ЮKassa отправит чеки 54-ФЗ на указанный email. Это обязательное
          требование закона.
        </p>

        <div className="mt-24 flex flex-col gap-16">
          <Input
            label="Email"
            value={email}
            onChange={(v) => setEmail(v)}
            placeholder="courier@mail.ru"
            error={error ?? undefined}
            icon={Mail}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isValid}
            loading={loading}
            onClick={handleSubmit}
          >
            Сохранить
          </Button>

          <button onClick={handleSkip} className="body-sm text-ink-500 text-center underline">
            Не хочу получать чеки на email
          </button>

          <p className="caption text-ink-400 text-center m-0">
            Если не укажешь email, чеки будут храниться в личном кабинете ЮKassa
          </p>
        </div>
      </main>
    </div>
  );
}
