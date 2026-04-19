import { api } from "./client";

export type PaymentMethod = {
  id: string;
  card_last4: string;
  card_network: string;
  is_default: boolean;
  expires_at: string | null;
};

export type PaymentMethodInitResponse = {
  confirmation_token: string;
  payment_id: string;
};

export type SubscriptionInfo = {
  id: string;
  plan: string;
  price: number;
  status: string;
  started_at: string | null;
  next_charge_at: string | null;
  cancelled_at: string | null;
  ends_at: string | null;
} | null;

export const paymentsApi = {
  listMethods: () => api.get<PaymentMethod[]>("/client/me/payment-methods"),
  initMethod: () => api.post<PaymentMethodInitResponse>("/client/me/payment-methods/init"),
  confirmMethod: (data: { payment_id: string; payment_method_id: string }) =>
    api.post("/client/me/payment-methods/confirm", data),
  deleteMethod: (id: string) => api.delete(`/client/me/payment-methods/${id}`),
  setDefault: (id: string) => api.post(`/client/me/payment-methods/${id}/set-default`),

  getSubscription: () => api.get<SubscriptionInfo>("/client/me/subscription"),
  createSubscription: () => api.post("/client/me/subscription"),
  cancelSubscription: () => api.post("/client/me/subscription/cancel"),

  setEmail: (email: string) => api.post("/client/me/email", { email }),
};
