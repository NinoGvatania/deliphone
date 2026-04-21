import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@deliphone/ui";
import { ArrowLeft, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api/client";

export function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!firstName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<any>("/client/me/update", {
        first_name: firstName.trim(),
      });
      // Update local store
      if (user) {
        setAuth({
          access_token: useAuthStore.getState().accessToken!,
          refresh_token: useAuthStore.getState().refreshToken!,
          user: { ...user, first_name: res.first_name, email: res.email },
        });
      }
      setSaved(true);
      setTimeout(() => navigate(-1), 800);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate(-1)} className="text-ink-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="body font-semibold m-0 flex-1">Редактировать профиль</h2>
        <button onClick={handleSave} disabled={loading || !firstName.trim()} className="text-ink-900 disabled:opacity-40">
          <Check size={20} />
        </button>
      </div>

      <div className="px-16 py-20 max-w-[480px] mx-auto flex flex-col gap-16">
        {saved && (
          <div className="px-12 py-8 bg-success-bg rounded-lg">
            <p className="body-sm text-success m-0 text-center">Сохранено!</p>
          </div>
        )}

        <div>
          <label className="body-sm text-ink-500 mb-4 block">Имя</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-16 py-12 rounded-lg border border-ink-200 bg-ink-0 body text-ink-900 outline-none focus:border-accent" />
        </div>

        <div>
          <label className="body-sm text-ink-500 mb-4 block">Телефон</label>
          <input type="text" value={user?.phone_number || ""} disabled
            className="w-full px-16 py-12 rounded-lg border border-ink-100 bg-ink-50 body text-ink-400" />
          <p className="caption text-ink-400 mt-4">Номер нельзя изменить</p>
        </div>

      </div>
    </div>
  );
}
