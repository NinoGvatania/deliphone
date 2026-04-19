import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { AuthRegSuccessPage } from "@/pages/AuthRegSuccessPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { HomePage } from "@/pages/HomePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/reg/:sessionId", element: <AuthPage /> },
  { path: "/auth/reg-success", element: <AuthRegSuccessPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
]);
