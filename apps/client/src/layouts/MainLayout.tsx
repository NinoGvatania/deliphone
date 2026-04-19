import { useEffect } from "react";
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
  const isAuth = useAuthStore((s) => s.isAuthenticated)();

  // Only redirect from "/" root — sub-pages like /profile always accessible
  useEffect(() => {
    if (!isAuth) {
      navigate("/auth", { replace: true });
      return;
    }
    // Only redirect from exact "/" (map page) if KYC not done
    if (pathname === "/" && user && user.kyc_status !== "approved") {
      navigate("/kyc", { replace: true });
    }
  }, [isAuth, user, pathname, navigate]);

  const showTabs = isAuth;

  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader left={<Logo size="sm" />} />
      <main className="flex-1">
        <Outlet />
      </main>
      {showTabs && (
        <nav className="sticky bottom-0 z-10 bg-ink-0 border-t border-ink-200 flex">
          {TABS.map((tab) => {
            const active = pathname === tab.path ||
              (tab.path === "/profile" && pathname.startsWith("/profile"));
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex-1 flex flex-col items-center gap-2 py-8 transition-colors"
                style={{ color: active ? colors.ink[900] : colors.ink[400] }}
              >
                <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="caption" style={{ fontWeight: active ? 600 : 400 }}>
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
