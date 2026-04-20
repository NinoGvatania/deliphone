import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

export function MainLayout() {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated)();

  useEffect(() => {
    if (!isAuth) navigate("/auth", { replace: true });
  }, [isAuth, navigate]);

  return <Outlet />;
}
