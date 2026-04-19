import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppHeader, Logo } from "@deliphone/ui";
import { Map, Package, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@deliphone/ui/tokens";

const TABS = [
  { path: "/", icon: Map, label: "Карта" },
  { path: "/rentals", icon: Package, label: "Аренды" },
  { path: "/profile", icon: User, label: "Профиль" },
] as const;

export function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showTabs = user?.kyc_status === "approved";

  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader left={<Logo size="sm" />} />
      <main className="flex-1">
        <Outlet />
      </main>
      {showTabs && (
        <nav className="sticky bottom-0 z-10 bg-ink-0 border-t border-ink-200 flex">
          {TABS.map((tab) => {
            const active = pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex-1 flex flex-col items-center gap-2 py-8 transition-colors"
                style={{ color: active ? colors.accent.ink : colors.ink[500] }}
              >
                <tab.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="caption" style={{ fontWeight: active ? 600 : 500 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
