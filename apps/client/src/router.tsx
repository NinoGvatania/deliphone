import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthPage } from "@/pages/AuthPage";
import { AuthRegSuccessPage } from "@/pages/AuthRegSuccessPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { MapPage } from "@/pages/MapPage";
import { BookingPage } from "@/pages/BookingPage";
import { RentalsListPage } from "@/pages/RentalsListPage";
import { BookedPage } from "@/pages/rental/BookedPage";
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
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MapPage /> },
      { path: "rentals", element: <RentalsListPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/subscription", element: <SubscriptionPage /> },
      { path: "profile/email", element: <EmailPage /> },
      { path: "profile/bind-card", element: <BindCardPage /> },
      { path: "profile/bind-card/success", element: <BindCardPage /> },
    ],
  },
  { path: "/booking/:locationId", element: <BookingPage /> },
  { path: "/rental/:id", element: <ActiveRentalPage /> },
  { path: "/rental/:id/booked", element: <BookedPage /> },
  { path: "/rental/:id/return", element: <ReturnPage /> },
  { path: "/rental/:id/incident", element: <IncidentPage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/reg/:sessionId", element: <AuthPage /> },
  { path: "/auth/reg-success", element: <AuthRegSuccessPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  { path: "/kyc", element: <KycFlowPage /> },
  { path: "/kyc/pending", element: <KycPendingPage /> },
  { path: "/kyc/rejected", element: <KycRejectedPage /> },
  { path: "/c/:token", element: <BindCardPage /> },
]);
