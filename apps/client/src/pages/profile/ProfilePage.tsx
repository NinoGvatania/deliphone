import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card } from "@deliphone/ui";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  History,
  LogOut,
  Mail,
  MessageCircle,
  Shield,
  Smartphone,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { paymentsApi } from "@/api/payments";
import { rentalsApi } from "@/api/rentals";
import { colors } from "@deliphone/ui/tokens";

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => paymentsApi.getSubscription(),
  });

  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => paymentsApi.listMethods(),
  });

  const { data: history } = useQuery({
    queryKey: ["rentals-history"],
    queryFn: () => rentalsApi.list("history"),
  });

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const kycLabel = {
    approved: "Верифицирован",
    pending: "На проверке",
    rejected: "Отклонено",
    none: "Не пройдена",
  }[user?.kyc_status ?? "none"] ?? user?.kyc_status;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate("/")} className="text-ink-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="body font-semibold m-0 flex-1">Профиль</h2>
      </div>

      <div className="px-16 py-20 flex flex-col gap-20 max-w-[480px] mx-auto">
        {/* User card */}
        <div className="flex items-center gap-16">
          {user?.telegram_photo_url ? (
            <img src={user.telegram_photo_url} alt="" className="rounded-full object-cover" style={{ width: 56, height: 56 }} />
          ) : (
            <div className="rounded-full bg-ink-900 text-accent flex items-center justify-center font-bold" style={{ width: 56, height: 56, fontSize: 22 }}>
              {user?.telegram_first_name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="h3 truncate">{user?.telegram_first_name ?? "Пользователь"}</div>
            {user?.telegram_username && <div className="body-sm text-ink-500">@{user.telegram_username}</div>}
          </div>
          <Badge
            variant={user?.kyc_status === "approved" ? "success" : "neutral"}
            size="sm"
          >
            {kycLabel}
          </Badge>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          <SectionLabel>Аренда</SectionLabel>
          <MenuItem
            icon={Smartphone} label="Мои аренды"
            right={<Badge variant="neutral" size="sm">{history?.total ?? 0}</Badge>}
            onClick={() => navigate("/rentals")}
          />
          <MenuItem
            icon={Shield} label="Подписка «Удобно»"
            right={subscription?.status === "active"
              ? <Badge variant="accent" size="sm">Активна</Badge>
              : <span className="caption text-ink-400">199 ₽/мес</span>}
            onClick={() => navigate("/profile/subscription")}
          />
        </div>

        <div className="flex flex-col gap-8">
          <SectionLabel>Оплата</SectionLabel>
          <MenuItem
            icon={CreditCard} label="Карты"
            right={<Badge variant="neutral" size="sm">{methods?.length ?? 0}</Badge>}
            onClick={() => navigate("/profile/bind-card")}
          />
          <MenuItem
            icon={Mail} label="Email для чеков"
            onClick={() => navigate("/profile/email")}
          />
        </div>

        <div className="flex flex-col gap-8">
          <SectionLabel>Верификация</SectionLabel>
          <MenuItem
            icon={History} label="Верификация KYC"
            right={<Badge variant={user?.kyc_status === "approved" ? "success" : "neutral"} size="sm">{kycLabel}</Badge>}
            onClick={() => navigate("/kyc")}
          />
        </div>

        <div className="flex flex-col gap-8">
          <SectionLabel>Поддержка</SectionLabel>
          <MenuItem
            icon={MessageCircle} label="Чат поддержки"
            right={<span className="caption text-ink-400">Скоро</span>}
          />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-12 px-16 py-12 body text-danger"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="caption text-ink-400 uppercase tracking-wider m-0 px-4">{children}</p>;
}

function MenuItem({
  icon: Ico, label, right, onClick,
}: {
  icon: React.ComponentType<any>;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-12 bg-ink-0 text-left transition-colors hover:bg-ink-50"
      style={{ padding: "12px 16px", borderRadius: 14, border: `1px solid ${colors.ink[100]}` }}
    >
      <Ico size={18} className="text-ink-500 shrink-0" />
      <span className="flex-1 body">{label}</span>
      {right}
      <ChevronRight size={16} className="text-ink-300 shrink-0" />
    </button>
  );
}
