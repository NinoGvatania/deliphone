import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { AuthRegSuccessPage } from "@/pages/AuthRegSuccessPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { MapPage } from "@/pages/MapPage";
import { ScanPage } from "@/pages/ScanPage";
import { RentPage } from "@/pages/RentPage";
import { RentalsListPage } from "@/pages/RentalsListPage";
import { ActiveRentalPage } from "@/pages/rental/ActiveRentalPage";
import { ReturnPage } from "@/pages/rental/ReturnPage";
import { IncidentPage } from "@/pages/rental/IncidentPage";
import { KycFlowPage } from "@/pages/kyc/KycFlowPage";
import { KycPendingPage } from "@/pages/kyc/KycPendingPage";
import { KycRejectedPage } from "@/pages/kyc/KycRejectedPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { SubscriptionPage } from "@/pages/profile/SubscriptionPage";
import { EmailPage } from "@/pages/profile/EmailPage";
import { BindCardPage } from "@/pages/profile/BindCardPage";

export const router = createBrowserRouter([
  // Main — full screen map
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MapPage /> },
    ],
  },

  // Rental flow
  { path: "/scan", element: <ScanPage /> },
  { path: "/rent/:locationId", element: <RentPage /> },
  { path: "/rental/:id", element: <ActiveRentalPage /> },
  { path: "/rental/:id/return", element: <ReturnPage /> },
  { path: "/rental/:id/incident", element: <IncidentPage /> },
  { path: "/rentals", element: <RentalsListPage /> },

  // Profile & settings (full screen with back button)
  { path: "/profile", element: <ProfilePage /> },
  { path: "/profile/subscription", element: <SubscriptionPage /> },
  { path: "/profile/email", element: <EmailPage /> },
  { path: "/profile/bind-card", element: <BindCardPage /> },
  { path: "/profile/bind-card/success", element: <BindCardPage /> },

  // Auth
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/reg/:sessionId", element: <AuthPage /> },
  { path: "/auth/reg-success", element: <AuthRegSuccessPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },

  // KYC
  { path: "/kyc", element: <KycFlowPage /> },
  { path: "/kyc/pending", element: <KycPendingPage /> },
  { path: "/kyc/rejected", element: <KycRejectedPage /> },

  // Partner card binding QR
  { path: "/c/:token", element: <BindCardPage /> },
]);
