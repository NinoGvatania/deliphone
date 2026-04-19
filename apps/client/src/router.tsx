import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { AuthRegSuccessPage } from "@/pages/AuthRegSuccessPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { HomePage } from "@/pages/HomePage";
import { KycFlowPage } from "@/pages/kyc/KycFlowPage";
import { KycPendingPage } from "@/pages/kyc/KycPendingPage";
import { KycRejectedPage } from "@/pages/kyc/KycRejectedPage";

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
  { path: "/kyc", element: <KycFlowPage /> },
  { path: "/kyc/pending", element: <KycPendingPage /> },
  { path: "/kyc/rejected", element: <KycRejectedPage /> },
]);
