import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { WelcomePage } from "@/pages/WelcomePage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { MapPage } from "@/pages/MapPage";
import { ScanPage } from "@/pages/ScanPage";
import { RentPage } from "@/pages/RentPage";
import { RentalsListPage } from "@/pages/RentalsListPage";
import { ActiveRentalPage } from "@/pages/rental/ActiveRentalPage";
import { ReturnPage } from "@/pages/rental/ReturnPage";
import { IncidentPage } from "@/pages/rental/IncidentPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { SubscriptionPage } from "@/pages/profile/SubscriptionPage";
import { EmailPage } from "@/pages/profile/EmailPage";
import { BindCardPage } from "@/pages/profile/BindCardPage";
import { EditProfilePage } from "@/pages/profile/EditProfilePage";
import { FoundDevicePage } from "@/pages/FoundDevicePage";
import { ChatListPage } from "@/pages/support/ChatListPage";
import { ChatPage } from "@/pages/support/ChatPage";
import { ActivationScanPage } from "@/pages/activation/ActivationScanPage";
import { ActivationPayPage } from "@/pages/activation/ActivationPayPage";

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
  { path: "/profile/edit", element: <EditProfilePage /> },
  { path: "/profile/subscription", element: <SubscriptionPage /> },
  { path: "/profile/email", element: <EmailPage /> },
  { path: "/profile/bind-card", element: <BindCardPage /> },
  { path: "/profile/bind-card/success", element: <BindCardPage /> },

  // Auth
  { path: "/auth", element: <AuthPage /> },
  { path: "/welcome", element: <WelcomePage /> },
  { path: "/onboarding", element: <OnboardingPage /> },

  // Activation (pre-activation QR payment)
  { path: "/activate", element: <ActivationScanPage /> },
  { path: "/activate/pay", element: <ActivationPayPage /> },

  // Support chat
  { path: "/support", element: <ChatListPage /> },
  { path: "/support/:chatId", element: <ChatPage /> },

  // Found device (QR scan by finder)
  { path: "/found/:code", element: <FoundDevicePage /> },

  // Partner card binding QR
  { path: "/c/:token", element: <BindCardPage /> },
]);
