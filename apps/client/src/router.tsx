import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { AuthRegSuccessPage } from "@/pages/AuthRegSuccessPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { HomePage } from "@/pages/HomePage";
import { KycFlowPage } from "@/pages/kyc/KycFlowPage";
import { KycPendingPage } from "@/pages/kyc/KycPendingPage";
import { KycRejectedPage } from "@/pages/kyc/KycRejectedPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { SubscriptionPage } from "@/pages/profile/SubscriptionPage";
import { EmailPage } from "@/pages/profile/EmailPage";
import { BindCardPage } from "@/pages/profile/BindCardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/subscription", element: <SubscriptionPage /> },
      { path: "profile/email", element: <EmailPage /> },
      { path: "profile/bind-card", element: <BindCardPage /> },
      { path: "profile/bind-card/success", element: <BindCardPage /> },
      { path: "rentals", element: <HomePage /> }, // placeholder
    ],
  },
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/reg/:sessionId", element: <AuthPage /> },
  { path: "/auth/reg-success", element: <AuthRegSuccessPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  { path: "/kyc", element: <KycFlowPage /> },
  { path: "/kyc/pending", element: <KycPendingPage /> },
  { path: "/kyc/rejected", element: <KycRejectedPage /> },
  { path: "/c/:token", element: <BindCardPage /> },
]);
