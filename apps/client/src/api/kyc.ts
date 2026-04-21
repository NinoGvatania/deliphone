import { api } from "./client";

export type KycInitResponse = {
  submission_id: string;
  upload_urls: Record<string, string>;
};

export type KycSubmitRequest = {
  submission_id: string;
  full_name: string;
  birth_date: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issue_date: string;
  registration_address: string;
  consent_pdn: boolean;
  consent_offer: boolean;
};

export type KycStatus = {
  submission_id: string | null;
  status: string;
  auto_flags: Record<string, string> | null;
  reviewer_comment: string | null;
  rejection_reason: string | null;
  resubmit_requested_files: string[] | null;
};

export const kycApi = {
  init: () => api.post<KycInitResponse>("/client/me/kyc/init"),
  submit: (data: KycSubmitRequest) => api.post("/client/me/kyc/submit", data),
  resubmit: (previousId: string) =>
    api.post<KycInitResponse>("/client/me/kyc/resubmit", { previous_submission_id: previousId }),
  getStatus: () => api.get<KycStatus>("/client/me/kyc"),
};
