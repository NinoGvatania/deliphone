import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminShell } from "@/layouts/AdminShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { KycPage } from "@/pages/KycPage";
import { UsersPage } from "@/pages/UsersPage";
import { SubscriptionsPage } from "@/pages/SubscriptionsPage";
import { DevicesPage } from "@/pages/DevicesPage";
import { RentalsPage } from "@/pages/RentalsPage";
import { IncidentsPage } from "@/pages/IncidentsPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { LocationsPage } from "@/pages/LocationsPage";
import { AuditsPage } from "@/pages/AuditsPage";
import { ServicePage } from "@/pages/ServicePage";
import { LogisticsPage } from "@/pages/LogisticsPage";
import { FinancePage } from "@/pages/FinancePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SupportPage } from "@/pages/SupportPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "kyc", element: <KycPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "subscriptions", element: <SubscriptionsPage /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "rentals", element: <RentalsPage /> },
      { path: "incidents", element: <IncidentsPage /> },
      { path: "partners", element: <PartnersPage /> },
      { path: "locations", element: <LocationsPage /> },
      { path: "audits", element: <AuditsPage /> },
      { path: "service", element: <ServicePage /> },
      { path: "logistics", element: <LogisticsPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "audit-log", element: <AuditLogPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "support", element: <SupportPage /> },
    ],
  },
]);
