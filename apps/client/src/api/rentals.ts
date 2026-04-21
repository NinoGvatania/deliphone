import { api } from "./client";

export type RentalBrief = {
  id: string;
  status: string;
  device: { id: string; model: string; short_code: string; color: string | null };
  location_name: string;
  activated_at: string | null;
  paid_until: string | null;
  next_charge_at: string | null;
  deposit_amount: number | null;
  total_charged: number;
  debt_amount: number;
  booking_expires_at: string | null;
};

export type RentalListResponse = {
  items: RentalBrief[];
  total: number;
};

export type IncidentBrief = {
  id: string;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
};

export const rentalsApi = {
  create: (data: { device_id: string; location_id: string; with_udobno_subscription?: boolean }) =>
    api.post<RentalBrief>("/client/rentals", data),

  list: (filter: "active" | "history" = "active") =>
    api.get<RentalListResponse>("/client/rentals", { status_filter: filter }),

  get: (id: string) => api.get<RentalBrief>(`/client/rentals/${id}`),

  cancelBooking: (id: string) =>
    api.post(`/client/rentals/${id}/cancel-booking`),

  confirmPickup: (id: string) =>
    api.post(`/client/rentals/${id}/confirm-pickup`),

  reportPickupIssue: (id: string, data: { issue_type: string; description: string; photo_urls?: string[] }) =>
    api.post(`/client/rentals/${id}/report-pickup-issue`, data),

  initReturn: (id: string) =>
    api.post(`/client/rentals/${id}/init-return`),

  confirmReturn: (id: string, data: { return_session_id: string }) =>
    api.post(`/client/rentals/${id}/confirm-return`, data),

  reportReturnDispute: (id: string) =>
    api.post(`/client/rentals/${id}/report-return-dispute`),

  createIncident: (data: { rental_id: string; type: string; description: string; photo_urls?: string[] }) =>
    api.post<IncidentBrief>("/client/incidents", data),

  listIncidents: () => api.get<IncidentBrief[]>("/client/incidents"),
};
