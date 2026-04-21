import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Card } from "@deliphone/ui";
import { Phone } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";
import { PhoneInput } from "@/components/PhoneInput";

export function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated)();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [rawPhone, setRawPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuth) navigate("/", { replace: true });
  }, [isAuth, navigate]);

  async function handleSendCode() {
    if (rawPhone.length < 11) { setError("Введи номер полностью"); return; }
    setLoading(true); setError(null); setDevCode(null);
    try {
      const res = await api.post<any>("/auth/register/send-code", { phone_number: rawPhone });
      setIsNewUser(!!res.is_new_user);
      if (res.dev_code) setDevCode(res.dev_code);
      setStep("code");
    } catch (e: any) { setError(e.message || "Ошибка отправки"); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    if (code.length !== 4) { setError("Введи 4-значный код"); return; }
    setLoading(true); setError(null);
    try {
      const body: any = { phone_number: rawPhone, code };
      if (isNewUser) {
        body.first_name = "Клиент";
        body.consent = true;
      }
      const res = await api.post<any>("/auth/register/verify", body);
      setAuth(res);
      navigate(isNewUser ? "/welcome" : "/", { replace: true });
    } catch (e: any) { setError(e.message || "Неверный код"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div className="rounded-full bg-accent flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <Phone size={24} className="text-accent-ink" />
            </div>

            {step === "phone" ? (
              <>
                <h1 className="h2 m-0">Войди, чтобы начать</h1>
                <p className="body text-ink-500 m-0">Введи номер — пришлём код в SMS</p>

                <PhoneInput value={rawPhone} onChange={setRawPhone} className="w-full" />

                {error && <p className="body-sm text-danger m-0">{error}</p>}

                <button onClick={handleSendCode} disabled={loading}
                  className="w-full px-16 py-12 rounded-full bg-ink-900 text-ink-0 body font-semibold disabled:opacity-50">
                  {loading ? "Отправляем..." : "Получить код"}
                </button>
              </>
            ) : (
              <>
                <h1 className="h2 m-0">Код из SMS</h1>
                <p className="body text-ink-500 m-0">Отправили на {rawPhone}</p>

                <input type="text" inputMode="numeric" maxLength={4} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000" autoFocus
                  className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center tracking-[0.5em] outline-none focus:border-accent" />

                {devCode && (
                  <div className="w-full px-12 py-8 bg-accent-soft rounded-lg">
                    <p className="body-sm m-0 text-center" style={{ color: "#0F1410" }}>
                      DEV код: <strong className="tracking-[0.3em]">{devCode}</strong>
                    </p>
                  </div>
                )}

                {error && <p className="body-sm text-danger m-0">{error}</p>}

                <button onClick={handleVerify} disabled={loading}
                  className="w-full px-16 py-12 rounded-full bg-ink-900 text-ink-0 body font-semibold disabled:opacity-50">
                  {loading ? "Проверяем..." : "Подтвердить"}
                </button>

                <button onClick={() => { setStep("phone"); setCode(""); setError(null); setDevCode(null); }}
                  className="body-sm text-ink-500 underline">
                  Изменить номер
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
