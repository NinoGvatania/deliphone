import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AppHeader, Logo } from "@deliphone/ui";
import { useAuthStore } from "@/stores/auth";

function Clock() {
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className="mono text-ink-500">{time}</span>;
}

function formatTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function PartnerLayout() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader
        sticky
        paddingInline={24}
        left={<Logo size="md" />}
        right={
          <div className="flex items-center gap-8 body-sm text-ink-500 whitespace-nowrap">
            <span className="truncate max-w-[260px]">{user?.point_name ?? "Точка"}</span>
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full bg-accent shrink-0"
            />
            <span className="truncate max-w-[140px]">{user?.operator_name ?? user?.email}</span>
            <Clock />
          </div>
        }
      />

      <main className="flex-1 px-24 py-24 lg:px-48 lg:py-32">
        <div className="max-w-[1024px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
