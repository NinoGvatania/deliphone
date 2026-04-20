import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Card, Spinner } from "@deliphone/ui";
import { Phone } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";

export function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated)();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuth) {
      navigate("/", { replace: true });
    }
  }, [isAuth, navigate]);

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 1) return "+7";
    const rest = digits.slice(1, 11);
    let formatted = "+7";
    if (rest.length > 0) formatted += ` (${rest.slice(0, 3)}`;
    if (rest.length >= 3) formatted += ")";
    if (rest.length > 3) formatted += ` ${rest.slice(3, 6)}`;
    if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;
    if (rest.length > 8) formatted += `-${rest.slice(8, 10)}`;
    return formatted;
  }

  function getRawPhone(): string {
    return "+" + phone.replace(/\D/g, "");
  }

  async function handleSendCode() {
    const raw = getRawPhone();
    if (raw.length !== 12) {
      setError("Введи номер полностью");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ is_new_user: boolean }>(
        "/client/auth/register/send-code",
        { phone: raw },
      );
      setIsNewUser(res.is_new_user);
      setStep("code");
    } catch (e: any) {
      setError(e.message || "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 4) {
      setError("Введи 4-значный код");
      return;
    }
    if (isNewUser && !firstName.trim()) {
      setError("Укажи имя");
      return;
    }
    if (isNewUser && !consent) {
      setError("Необходимо согласие на обработку данных");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        phone: getRawPhone(),
        code,
      };
      if (isNewUser) {
        body.first_name = firstName.trim();
        if (email.trim()) body.email = email.trim();
      }
      const res = await api.post<any>("/client/auth/register/verify", body);
      setAuth(res);
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e.message || "Неверный код");
    } finally {
      setLoading(false);
    }
  }

  if (loading && step === "phone") {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-16">
          <Spinner size={32} />
          <p className="body text-ink-500">Отправляем код...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div
              className="rounded-full bg-accent flex items-center justify-center"
              style={{ width: 48, height: 48 }}
            >
              <Phone size={24} className="text-accent-ink" />
            </div>

            {step === "phone" && (
              <>
                <h1 className="h2 m-0">Войди, чтобы начать</h1>
                <p className="body text-ink-500 m-0">
                  Введи номер телефона — пришлём код в SMS
                </p>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 (900) 123-45-67"
                  className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent"
                />

                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full px-16 py-12 rounded-full bg-accent text-accent-ink body font-semibold transition-opacity disabled:opacity-50"
                >
                  Получить код
                </button>
              </>
            )}

            {step === "code" && (
              <>
                <h1 className="h2 m-0">Код из SMS</h1>
                <p className="body text-ink-500 m-0">
                  Отправили на {phone}
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center tracking-[0.5em] outline-none focus:border-accent"
                  autoFocus
                />

                {isNewUser && (
                  <>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Имя"
                      className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (необязательно)"
                      className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent"
                    />

                    <label className="flex items-start gap-8 text-left cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-4 shrink-0"
                      />
                      <span className="body-sm text-ink-500">
                        Соглашаюсь на обработку персональных данных и принимаю условия оферты
                      </span>
                    </label>
                  </>
                )}

                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="w-full px-16 py-12 rounded-full bg-accent text-accent-ink body font-semibold transition-opacity disabled:opacity-50"
                >
                  {loading ? "Проверяем..." : "Подтвердить"}
                </button>

                <button
                  onClick={() => { setStep("phone"); setCode(""); setError(null); }}
                  className="body-sm text-ink-500 underline"
                >
                  Изменить номер
                </button>
              </>
            )}

            {error && <p className="body-sm text-danger m-0">{error}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
