import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Card } from "@deliphone/ui";
import { User, Mail, ArrowRight } from "lucide-react";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

export function WelcomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [firstName, setFirstName] = useState(user?.first_name === "Клиент" ? "" : user?.first_name || "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!firstName.trim()) return;
    setLoading(true);
    try {
      // Update profile
      if (firstName.trim()) {
        await api.post("/client/me/update", { first_name: firstName.trim(), email: email.trim() || undefined });
      }
      navigate("/", { replace: true });
    } catch {
      // Если endpoint не существует — просто идём дальше
      navigate("/", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-20 py-32">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-24">
        <Logo size="lg" />

        <Card variant="elevated" padding={32}>
          <div className="flex flex-col items-center gap-16 text-center">
            <div className="rounded-full bg-accent flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <User size={24} className="text-accent-ink" />
            </div>

            <h1 className="h2 m-0">Добро пожаловать!</h1>
            <p className="body text-ink-500 m-0">Расскажи немного о себе</p>

            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="Как тебя зовут?"
              className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent" />

            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email для чеков (необязательно)"
              className="w-full px-16 py-12 rounded-full border border-ink-200 bg-ink-0 body text-ink-900 text-center outline-none focus:border-accent" />

            <p className="caption text-ink-400 m-0">
              {email ? "Чеки 54-ФЗ будут приходить на email" : "Без email чеки придут по SMS"}
            </p>

            <button onClick={handleSave} disabled={loading || !firstName.trim()}
              className="w-full px-16 py-12 rounded-full bg-ink-900 text-ink-0 body font-semibold disabled:opacity-50 flex items-center justify-center gap-8">
              Начать <ArrowRight size={18} />
            </button>

            <button onClick={() => navigate("/", { replace: true })}
              className="body-sm text-ink-400 underline">
              Пропустить
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
