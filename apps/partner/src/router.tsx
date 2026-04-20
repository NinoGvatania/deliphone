import { createBrowserRouter } from "react-router-dom";
import { PartnerLayout } from "@/layouts/PartnerLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { RegistrationWizard } from "@/pages/registration/RegistrationWizard";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <PartnerLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
    ],
  },
  { path: "/register", element: <RegistrationWizard /> },
]);
