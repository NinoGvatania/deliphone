import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Badge } from "@deliphone/ui";
import {
  CreditCard,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { paymentsApi } from "@/api/payments";

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

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="px-16 py-20 max-w-[480px] mx-auto w-full flex flex-col gap-16">
      {/* User header */}
      <div className="flex items-center gap-16">
        {user?.telegram_photo_url ? (
          <img
            src={user.telegram_photo_url}
            alt=""
            className="rounded-full object-cover"
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <div
            className="rounded-full bg-ink-900 text-accent flex items-center justify-center font-bold"
            style={{ width: 48, height: 48, fontSize: 20 }}
          >
            {user?.telegram_first_name?.[0] ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="h3 truncate">{user?.telegram_first_name ?? "Пользователь"}</div>
          {user?.telegram_username && (
            <div className="body-sm text-ink-500">@{user.telegram_username}</div>
          )}
        </div>
      </div>

      {/* KYC status */}
      <KycStatusBlock kycStatus={user?.kyc_status} />

      {/* Subscription block */}
      <ProfileSection
        icon={Shield}
        title="Подписка «Удобно»"
        right={
          subscription?.status === "active" ? (
            <Badge variant="accent" size="sm">Активна</Badge>
          ) : (
            <span className="body-sm text-accent-ink font-semibold">199 ₽/мес</span>
          )
        }
        onClick={() => navigate("/profile/subscription")}
      />

      {/* Cards */}
      <ProfileSection
        icon={CreditCard}
        title="Привязанные карты"
        right={
          <Badge variant="neutral" size="sm">
            {methods?.length ?? 0}
          </Badge>
        }
        onClick={() => navigate("/profile/bind-card")}
      />

      {/* Email */}
      <ProfileSection
        icon={Mail}
        title="Email для чеков"
        onClick={() => navigate("/profile/email")}
      />

      {/* Rentals history (placeholder) */}
      <ProfileSection
        icon={Package}
        title="История аренд"
        right={<Badge variant="neutral" size="sm">Скоро</Badge>}
        disabled
      />

      {/* Support (placeholder) */}
      <ProfileSection
        icon={MessageCircle}
        title="Чат поддержки"
        right={<Badge variant="neutral" size="sm">Скоро</Badge>}
        disabled
      />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-12 px-16 py-12 body text-danger hover:bg-danger-bg rounded-lg transition-colors"
      >
        <LogOut size={18} />
        Выйти
      </button>
    </div>
  );
}

function ProfileSection({
  icon: Ico,
  title,
  right,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<any>;
  title: string;
  right?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Card
      variant="elevated"
      padding={16}
      onClick={disabled ? undefined : onClick}
      style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-12">
        <div className="w-36 h-36 rounded-full bg-ink-100 flex items-center justify-center shrink-0">
          <Ico size={18} />
        </div>
        <span className="flex-1 body font-medium">{title}</span>
        {right}
      </div>
    </Card>
  );
}

const KYC_LABELS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  approved: { label: "Верифицирован", variant: "success" },
  pending: { label: "На проверке", variant: "info" },
  rejected: { label: "Отклонено", variant: "danger" },
  resubmit_requested: { label: "Нужно переснять", variant: "warning" },
  draft: { label: "Не завершено", variant: "neutral" },
  none: { label: "Не пройдена", variant: "neutral" },
};

function KycStatusBlock({ kycStatus }: { kycStatus?: string }) {
  const navigate = useNavigate();
  const status = kycStatus || "none";
  const info = KYC_LABELS[status] || KYC_LABELS["none"]!;
  const actionable = status !== "approved" && status !== "pending";

  return (
    <Card
      variant={status === "approved" ? "filled" : "outlined"}
      padding={16}
      onClick={actionable ? () => navigate("/kyc") : undefined}
      style={{ cursor: actionable ? "pointer" : "default" }}
    >
      <div className="flex items-center gap-12">
        <div
          className="rounded-full bg-ink-100 flex items-center justify-center shrink-0"
          style={{ width: 36, height: 36 }}
        >
          <Shield size={18} />
        </div>
        <div className="flex-1">
          <span className="body font-medium">Верификация</span>
          {actionable && (
            <div className="caption text-ink-500">Нажми, чтобы продолжить</div>
          )}
        </div>
        <Badge variant={info.variant} size="sm">{info.label}</Badge>
      </div>
    </Card>
  );
}
