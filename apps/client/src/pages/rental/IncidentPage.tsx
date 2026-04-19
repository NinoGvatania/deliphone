import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Spinner } from "@deliphone/ui";
import {
  ArrowLeft,
  Wrench,
  ShieldX,
  Search,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { rentalsApi } from "@/api/rentals";

const INCIDENT_TYPES = [
  {
    type: "malfunction",
    label: "Телефон сломан / работает плохо",
    icon: Wrench,
    placeholder: "Опиши, что именно не работает",
  },
  {
    type: "damage",
    label: "Телефон разбит / повреждён",
    icon: ShieldX,
    placeholder: "Что повреждено? Опиши подробно",
  },
  {
    type: "loss",
    label: "Я потерял телефон",
    icon: Search,
    placeholder: "Когда и где потерял? Обращался ли в полицию?",
  },
  {
    type: "theft",
    label: "Телефон украли",
    icon: AlertTriangle,
    placeholder: "Опиши обстоятельства. Обязательно подай заявление в полицию.",
  },
] as const;

type Step = "choose" | "form" | "done";

export function IncidentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choose");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const selected = INCIDENT_TYPES.find((t) => t.type === selectedType);

  const createIncident = useMutation({
    mutationFn: () =>
      rentalsApi.createIncident({
        rental_id: id!,
        type: selectedType!,
        description,
      }),
    onSuccess: () => setStep("done"),
  });

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button
          onClick={() => {
            if (step === "choose") navigate(`/rental/${id}`);
            else if (step === "form") {
              setStep("choose");
              setDescription("");
            } else navigate(`/rental/${id}`);
          }}
          className="text-ink-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="h3 m-0">Сообщить о проблеме</h2>
      </div>

      <div className="px-16 py-20 flex flex-col gap-16">
        {/* Step 1: Choose type */}
        {step === "choose" && (
          <>
            <p className="body text-ink-600 m-0">Что произошло?</p>
            {INCIDENT_TYPES.map((item) => (
              <Card
                key={item.type}
                variant="outlined"
                padding={16}
                onClick={() => {
                  setSelectedType(item.type);
                  setStep("form");
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-12">
                  <div className="w-40 h-40 rounded-full bg-ink-100 flex items-center justify-center shrink-0">
                    <item.icon size={20} className="text-ink-600" />
                  </div>
                  <p className="body m-0">{item.label}</p>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Step 2: Form */}
        {step === "form" && selected && (
          <>
            <Card variant="filled" padding={16}>
              <div className="flex items-center gap-12">
                <selected.icon size={20} className="text-ink-600 shrink-0" />
                <p className="body font-semibold m-0">{selected.label}</p>
              </div>
            </Card>

            <div>
              <label className="body-sm text-ink-600 mb-8 block">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={selected.placeholder}
                rows={5}
                className="w-full rounded-12 border border-ink-200 bg-ink-0 px-12 py-12 body-sm text-ink-900 resize-none focus:outline-none focus:border-ink-400"
              />
            </div>

            {(selectedType === "theft") && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-warning-ink m-0">
                  Для разрешения кражи потребуется талон-уведомление из полиции.
                  Саппорт свяжется с тобой в течение часа.
                </p>
              </Card>
            )}

            {(selectedType === "loss") && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-ink-600 m-0">
                  Аренда будет заморожена (автосписания остановлены). Талон из
                  полиции можно предоставить позже.
                </p>
              </Card>
            )}

            {createIncident.error && (
              <Card variant="filled" padding={12}>
                <p className="body-sm text-danger-ink m-0">
                  Ошибка: {(createIncident.error as Error).message}
                </p>
              </Card>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={description.trim().length < 10}
              loading={createIncident.isPending}
              onClick={() => createIncident.mutate()}
            >
              Отправить
            </Button>
          </>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <>
            <Card variant="elevated" padding={32}>
              <div className="flex flex-col items-center gap-16 text-center">
                <CheckCircle size={56} className="text-success-ink" />
                <div>
                  <p className="h3 m-0">Обращение отправлено</p>
                  <p className="body-sm text-ink-500 m-0 mt-8">
                    Саппорт свяжется с тобой в ближайшее время.
                  </p>
                </div>
              </div>
            </Card>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate(`/rental/${id}`, { replace: true })}
            >
              Вернуться к аренде
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
