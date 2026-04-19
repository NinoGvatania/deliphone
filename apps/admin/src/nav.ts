import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  FileSearch,
  Handshake,
  LayoutDashboard,
  MapPin,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Sidebar navigation — top-level sections of the admin panel.
 * Reference: docs/SPEC.md §7 (дашборд, KYC, клиенты, устройства, аренды,
 * инциденты, партнёры, точки, инвентаризации, сервис, логистика, финансы,
 * настройки, audit log, аналитика).
 */
export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon | ComponentType<{ size?: number }>;
  path: string;
};

export const NAV: readonly NavItem[] = [
  { key: "dashboard",    label: "Дашборд",         icon: LayoutDashboard, path: "/" },
  { key: "kyc",          label: "Модерация KYC",   icon: UserCheck,       path: "/kyc" },
  { key: "users",        label: "Клиенты",         icon: Users,           path: "/users" },
  { key: "devices",      label: "Устройства",      icon: Smartphone,      path: "/devices" },
  { key: "rentals",      label: "Аренды",          icon: Clock,           path: "/rentals" },
  { key: "incidents",    label: "Инциденты",       icon: AlertOctagon,    path: "/incidents" },
  { key: "partners",     label: "Партнёры",        icon: Handshake,       path: "/partners" },
  { key: "locations",    label: "Точки",           icon: MapPin,          path: "/locations" },
  { key: "audits",       label: "Инвентаризации",  icon: ClipboardList,   path: "/audits" },
  { key: "service",      label: "Сервис",          icon: ShieldCheck,     path: "/service" },
  { key: "logistics",    label: "Логистика",       icon: Truck,           path: "/logistics" },
  { key: "finance",      label: "Финансы",         icon: Wallet,          path: "/finance" },
  { key: "settings",     label: "Настройки",       icon: Settings,        path: "/settings" },
  { key: "audit-log",    label: "Audit log",       icon: ScrollText,      path: "/audit-log" },
  { key: "analytics",    label: "Аналитика",       icon: BarChart3,       path: "/analytics" },
] as const;

// Re-exported so tree-shakers keep imports alive even if some sections
// aren't rendered yet.
export const NAV_ICONS = { Boxes, FileSearch, Package };
