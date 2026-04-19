import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@deliphone/ui";

const kycDataSchema = z.object({
  last_name: z.string().min(2, "Минимум 2 символа"),
  first_name: z.string().min(2, "Минимум 2 символа"),
  patronymic: z.string().optional(),
  birth_date: z.string().min(1, "Обязательное поле").refine(
    (v) => {
      const birth = new Date(v);
      const now = new Date();
      const age = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return age >= 18;
    },
    { message: "Тебе должно быть не менее 18 лет" },
  ),
  passport_series: z.string().regex(/^\d{4}$/, "4 цифры"),
  passport_number: z.string().regex(/^\d{6}$/, "6 цифр"),
  passport_issued_by: z.string().min(5, "Минимум 5 символов"),
  passport_issue_date: z.string().min(1, "Обязательное поле"),
  registration_address: z.string().min(10, "Минимум 10 символов"),
});

export type KycFormData = z.infer<typeof kycDataSchema>;

type Props = {
  onCollected: (data: KycFormData) => void;
};

type FieldName = keyof KycFormData;

const FIELDS: {
  name: FieldName;
  label: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
}[] = [
  { name: "last_name", label: "Фамилия" },
  { name: "first_name", label: "Имя" },
  { name: "patronymic", label: "Отчество", hint: "Если есть" },
  { name: "birth_date", label: "Дата рождения", type: "date" },
  { name: "passport_series", label: "Серия", placeholder: "0000", maxLength: 4 },
  { name: "passport_number", label: "Номер", placeholder: "000000", maxLength: 6 },
  { name: "passport_issued_by", label: "Кем выдан" },
  { name: "passport_issue_date", label: "Дата выдачи", type: "date" },
  { name: "registration_address", label: "Адрес прописки" },
];

export function KycDataStep({ onCollected }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycDataSchema),
    defaultValues: { patronymic: "" },
  });

  const renderField = (field: (typeof FIELDS)[number]) => (
    <Controller
      key={field.name}
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ref } }) => (
        <Input
          ref={ref}
          label={field.label}
          type={field.type}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          hint={field.hint}
          value={value ?? ""}
          onChange={onChange}
          error={errors[field.name]?.message}
        />
      )}
    />
  );

  return (
    <div className="flex flex-col gap-16">
      <h2 className="h2 text-center">Паспортные данные</h2>
      <p className="body-sm text-ink-500 text-center">Введи данные точно как в паспорте</p>

      <form onSubmit={handleSubmit(onCollected)} className="flex flex-col gap-16">
        {FIELDS.slice(0, 4).map(renderField)}

        <div className="flex gap-12">{FIELDS.slice(4, 6).map(renderField)}</div>

        {FIELDS.slice(6).map(renderField)}

        <Button variant="primary" size="lg" fullWidth type="submit">
          Далее
        </Button>
      </form>
    </div>
  );
}
