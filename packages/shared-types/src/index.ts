/**
 * Shared TypeScript types and design tokens for Deliphone.
 *
 * API DTOs (Client, Partner, Admin) land here alongside domain enums
 * during later phases — see SPEC.md §13 (entities) and §14 (endpoints).
 */

export * from "./tokens.js";

// ----- Domain enums (mirror SPEC.md §13) -----

export type KycStatus = "none" | "pending" | "approved" | "rejected" | "resubmit_requested";
export type UserStatus = "active" | "suspended_debt" | "blocked";

export type RentalStatus =
  | "booked"
  | "pending_activation"
  | "active"
  | "paused_payment_failed"
  | "overdue"
  | "frozen_incident"
  | "pending_return_dispute"
  | "closed"
  | "closed_incident"
  | "cancelled_timeout"
  | "cancelled_manual";

// API DTO namespaces — filled during implementation phases.
// Kept as empty placeholders so consumers can import deterministic paths.

export namespace ClientApi {}
export namespace PartnerApi {}
export namespace AdminApi {}
