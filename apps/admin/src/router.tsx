import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminShell } from "@/layouts/AdminShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "*", element: <PlaceholderPage /> },
    ],
  },
]);
