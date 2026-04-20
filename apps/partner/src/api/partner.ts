import { api } from "./client";

// Dashboard
export const dashboardApi = {
  get: () => api.get<DashboardData>("/partner/dashboard"),
};

// Registration sessions
export const registrationApi = {
  create: () => api.post<RegSession>("/partner/registrations"),
  status: (id: string) => api.get<RegStatus>(`/partner/registrations/${id}/status`),
};

// KYC proxy
export const kycProxyApi = {
  init: (userId: string) => api.post<any>(`/partner/clients/${userId}/kyc/init`),
  uploadFile: (userId: string, submissionId: string, fileType: string, file: Blob) => {
    const fd = new FormData();
    fd.append("file", file, `${fileType}.jpg`);
    return fetch(`/api/v1/partner/clients/${userId}/kyc/upload-file?submission_id=${submissionId}&file_type=${fileType}`, {
      method: "POST",
      body: fd,
      headers: { Authorization: `Bearer ${api.getToken()}` },
    });
  },
  submit: (userId: string, data: any) => api.post(`/partner/clients/${userId}/kyc/submit`, data),
  cardBindingInit: (userId: string) => api.post<any>(`/partner/clients/${userId}/card-binding-init`),
  cardBindingStatus: (userId: string) => api.get<any>(`/partner/clients/${userId}/card-binding-status`),
  clientStatus: (userId: string) => api.get<any>(`/partner/clients/${userId}/status`),
};

// Issue wizard
export const issueApi = {
  scanClientQr: (qr: string) => api.post<any>("/partner/bookings/scan-client-qr", { qr_token: qr }),
  confirmIdentity: (id: string) => api.post(`/partner/bookings/${id}/confirm-identity`),
  scanDevice: (id: string, data: any) => api.post(`/partner/bookings/${id}/scan-device`, data),
  uploadPhotos: (id: string, urls: string[]) => api.post(`/partner/bookings/${id}/upload-photos`, { photo_urls: urls }),
  clientSignature: (id: string, url: string) => api.post(`/partner/bookings/${id}/client-signature`, { signature_url: url }),
  finalizeIssue: (id: string) => api.post(`/partner/bookings/${id}/finalize-issue`),
};

// Return wizard
export const returnApi = {
  init: (data: any) => api.post<any>("/partner/returns/init", data),
  qr: (id: string) => api.get<any>(`/partner/returns/${id}/qr`),
  status: (id: string) => api.get<any>(`/partner/returns/${id}/status`),
  frpCheck: (id: string, cleared: boolean) => api.post(`/partner/returns/${id}/frp-check`, { frp_cleared: cleared }),
  checklist: (id: string, items: any) => api.post(`/partner/returns/${id}/checklist`, { items }),
  createIncident: (id: string, data: any) => api.post(`/partner/returns/${id}/create-incident`, data),
  sanitization: (id: string, data: any) => api.post(`/partner/returns/${id}/sanitization`, data),
  finalize: (id: string) => api.post(`/partner/returns/${id}/finalize`),
};

// Inventory
export const inventoryApi = {
  list: () => api.get<any>("/partner/inventory"),
  auditScan: (auditId: string, data: any) => api.post(`/partner/inventory/audit/${auditId}/scan`, data),
  auditComplete: (auditId: string) => api.post(`/partner/inventory/audit/${auditId}/complete`),
};

// Finance
export const financeApi = {
  balance: () => api.get<any>("/partner/finance/balance"),
  transactions: (params?: any) => api.get<any>("/partner/finance/transactions", params),
  payouts: () => api.get<any>("/partner/finance/payouts"),
  act: (id: string) => api.get<string>(`/partner/finance/periods/${id}/act`),
};

// Types
export type DashboardData = {
  awaiting_issue: number;
  awaiting_return: number;
  devices_total: number;
  devices_free: number;
  revenue_today: number;
  acquisitions_today: number;
  acquisition_bonus: number;
};

export type RegSession = {
  session_id: string;
  qr_url: string;
  deep_link: string;
};

export type RegStatus = {
  status: string;
  user: any | null;
};
