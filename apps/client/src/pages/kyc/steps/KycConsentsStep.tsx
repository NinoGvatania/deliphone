import { useState } from "react";
import { Button } from "@deliphone/ui";
import { kycApi } from "@/api/kyc";
import type { KycFormData } from "./KycDataStep";

type Props = {
  submissionId: string;
  formData: KycFormData;
  onComplete: () => void;
};

export function KycConsentsStep({ submissionId, formData, onComplete }: Props) {
  const [consentPdn, setConsentPdn] = useState(false);
  const [consentOffer, setConsentOffer] = useState(false);
  const [consentAge, setConsentAge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = consentPdn && consentOffer && consentAge;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const fullName = [formData.last_name, formData.first_name, formData.patronymic]
        .filter(Boolean)
        .join(" ");
      await kycApi.submit({
        submission_id: submissionId,
        full_name: fullName,
        birth_date: formData.birth_date,
        passport_series: formData.passport_series,
        passport_number: formData.passport_number,
        passport_issued_by: formData.passport_issued_by,
        passport_issue_date: formData.passport_issue_date,
        registration_address: formData.registration_address,
        consent_pdn: consentPdn,
        consent_offer: consentOffer,
      });
      onComplete();
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : JSON.stringify(e?.message ?? "Ошибка отправки");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-24">
      <h2 className="h2 text-center">Согласия</h2>
      <p className="body-sm text-ink-500 text-center">
        Для завершения верификации необходимо принять условия
      </p>

      <div className="flex flex-col gap-16">
        <label className="flex items-start gap-12 cursor-pointer">
          <input
            type="checkbox"
            checked={consentPdn}
            onChange={(e) => setConsentPdn(e.target.checked)}
            className="mt-4 w-20 h-20 rounded accent-accent shrink-0"
          />
          <span className="body-sm text-ink-700">
            Согласие на обработку персональных данных в соответствии с Федеральным законом 152-ФЗ
          </span>
        </label>

        <label className="flex items-start gap-12 cursor-pointer">
          <input
            type="checkbox"
            checked={consentOffer}
            onChange={(e) => setConsentOffer(e.target.checked)}
            className="mt-4 w-20 h-20 rounded accent-accent shrink-0"
          />
          <span className="body-sm text-ink-700">
            Принимаю условия публичной оферты сервиса Делифон
          </span>
        </label>

        <label className="flex items-start gap-12 cursor-pointer">
          <input
            type="checkbox"
            checked={consentAge}
            onChange={(e) => setConsentAge(e.target.checked)}
            className="mt-4 w-20 h-20 rounded accent-accent shrink-0"
          />
          <span className="body-sm text-ink-700">Подтверждаю, что мне исполнилось 18 лет</span>
        </label>
      </div>

      {error && <p className="body-sm text-danger text-center">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!allChecked}
        loading={submitting}
        onClick={handleSubmit}
      >
        Отправить на проверку
      </Button>
    </div>
  );
}
