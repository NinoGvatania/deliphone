import { useState } from "react";
import { Button } from "@deliphone/ui";
import { Shield, Camera, FileText, Video } from "lucide-react";

type Props = { onStart: () => Promise<void> };

export function KycIntroStep({ onStart }: Props) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-24">
      <div className="w-64 h-64 rounded-full bg-accent/10 flex items-center justify-center">
        <Shield size={32} className="text-accent-ink" />
      </div>

      <h1 className="h1">Верификация личности</h1>
      <p className="body text-ink-600">
        Для аренды смартфона нужно подтвердить личность. Подготовь паспорт РФ.
      </p>

      <div className="w-full flex flex-col gap-12">
        <div className="flex items-center gap-12">
          <FileText size={20} className="text-ink-500 shrink-0" />
          <span className="body-sm text-ink-700">Фото паспорта (разворот + прописка)</span>
        </div>
        <div className="flex items-center gap-12">
          <Camera size={20} className="text-ink-500 shrink-0" />
          <span className="body-sm text-ink-700">Селфи с паспортом</span>
        </div>
        <div className="flex items-center gap-12">
          <Video size={20} className="text-ink-500 shrink-0" />
          <span className="body-sm text-ink-700">Короткое видео (3 секунды)</span>
        </div>
      </div>

      <p className="caption text-ink-400">Данные шифруются AES-256 и хранятся в РФ</p>

      <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleStart}>
        Начать верификацию
      </Button>
    </div>
  );
}
