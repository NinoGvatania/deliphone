import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Card, Spinner } from "@deliphone/ui";
import { MessageCircle, Phone } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";

const TG_BOT = import.meta.env.VITE_TG_BOT_USERNAME || "DeliphoneBot";

export function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated)();
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false);

  const [mode, setMode] = useState<"tg" | "sms">("tg");
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
    if (isAuth) navigate("/", { replace: true });
  }, [isAuth, navigate]);

  // Telegram Login Widget
  useEffect(() => {
    (window as any).onTelegramAuth = async (tgUser: any) => {
      setLoading(true);
      try {
        const res = await api.post<any>("/client/auth/telegram", tgUser);
        setAuth(res);
        navigate("/", { replace: true });
      } catch (e: any) {
        setError(e.message || "Ошибка авторизации");
        setLoading(false);
      }
    };

    if (widgetRef.current && !scriptAdded.current && mode === "tg") {
      scriptAdded.current = true;
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", TG_BOT);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "20");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      widgetRef.current.appendChild(script);
    }

    return () => { delete (window as any).onTelegramAuth; };
  }, [mode]);

  // SMS helpers
  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 1) return "+7";
    const rest = digits.slice(1, 11);
    let f = "+7";
    if (rest.length > 0) f += ` (${rest.slice(0, 3)}`;
    if (rest.length >= 3) f += ")";
    if (rest.length > 3) f += ` ${rest.slice(3, 6)}`;
    if (rest.length > 6) f += `-${rest.slice(6, 8)}`;
    if (rest.length > 8) f += `-${rest.slice(8, 10)}`;
    return f;
  }

  function getRawPhone() { return "+" + phone.replace(/\D/g, ""); }

  async function handleSendCode() {
    const raw = getRawPhone();
    if (raw.length < 12) { setError("Введи номер полностью"); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.post<any>("/auth/register/send-code", { phone_number: raw });
      setIsNewUser(!!res.is_new_user);
      setStep("code");
    } catch (e: any) { setError(e.message || "Ошибка"); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    if (code.length !== 4) { setError("Введи 4-значный код"); return; }
    if (isNewUser && !firstName.trim()) { setError("Укажи имя"); return; }
    if (isNewUser && !consent) { setError("Необходимо согласие"); return; }
    setLoading(true); setError(null);
    try {
      const body: any = { phone_number: getRawPhone(), code };
      if (isNewUser) { body.first_name = firstName.trim(); if (email.trim()) body.email = email.trim(); body.consent = true; }
      const res = await api.post<any>("/auth/register/verify", body);
      setAuth(res);
      navigate("/", { replace: true });
    } catch (e: any) { setError(e.message || "Неверный код"); }
    finally { setLoading(false); }
  }

  if (loading && mode === "tg") {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            {mode === "tg" ? (
              <>
                <div className="rounded-full bg-accent flex items-center justify-center" style={{ width: 48, height: 48 }}>
                  <MessageCircle size={24} className="text-accent-ink" />
                </div>
                <h1 className="h2 m-0">Войди, чтобы начать</h1>
                <p className="body text-ink-500 m-0">Авторизация через Telegram</p>

                <div ref={widgetRef} className="min-h-[44px]" />

                {error && <p className="body-sm text-danger m-0">{error}</p>}

                <button onClick={() => setMode("sms")} className="body-sm text-ink-500 underline">
                  Войти по номеру телефона
                </button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-ink-100 flex items-center justify-center" style={{ width: 48, height: 48 }}>
                  <Phone size={24} className="text-ink-600" />
                </div>

                {step === "phone" ? (
                  <>
                    <h1 className="h2 m-0">Вход по телефону</h1>
                    <p className="body text-ink-500 m-0">Пришлём код в SMS</p>
                    <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 (900) 123-45-67"
                      className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent" />
                    <button onClick={handleSendCode} disabled={loading}
                      className="w-full px-16 py-12 rounded-full bg-ink-900 text-ink-0 body font-semibold disabled:opacity-50">
                      {loading ? "Отправляем..." : "Получить код"}
                    </button>
                  </>
                ) : (
                  <>
                    <h1 className="h2 m-0">Код из SMS</h1>
                    <p className="body text-ink-500 m-0">Отправили на {phone}</p>
                    <input type="text" inputMode="numeric" maxLength={4} value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000"
                      className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center tracking-[0.5em] outline-none focus:border-accent" autoFocus />
                    {isNewUser && (
                      <>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Имя"
                          className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (необязательно)"
                          className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent" />
                        <label className="flex items-start gap-8 text-left cursor-pointer">
                          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-4 shrink-0" />
                          <span className="body-sm text-ink-500">Соглашаюсь на обработку данных и принимаю условия оферты</span>
                        </label>
                      </>
                    )}
                    <button onClick={handleVerify} disabled={loading}
                      className="w-full px-16 py-12 rounded-full bg-ink-900 text-ink-0 body font-semibold disabled:opacity-50">
                      {loading ? "Проверяем..." : "Подтвердить"}
                    </button>
                    <button onClick={() => { setStep("phone"); setCode(""); }} className="body-sm text-ink-500 underline">Изменить номер</button>
                  </>
                )}

                {error && <p className="body-sm text-danger m-0">{error}</p>}

                <button onClick={() => { setMode("tg"); setStep("phone"); setError(null); }} className="body-sm text-ink-500 underline">
                  Войти через Telegram
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
