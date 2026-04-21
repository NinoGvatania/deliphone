import { createBrowserRouter } from "react-router-dom";
import { PartnerLayout } from "@/layouts/PartnerLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { IssueWizard } from "@/pages/issue/IssueWizard";
import { ReturnWizard } from "@/pages/return/ReturnWizard";
import { InventoryPage } from "@/pages/InventoryPage";
import { FinancePage } from "@/pages/FinancePage";
import { SupportPage } from "@/pages/SupportPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <PartnerLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "support", element: <SupportPage /> },
    ],
  },
  { path: "/issue", element: <IssueWizard /> },
  { path: "/return", element: <ReturnWizard /> },
]);
