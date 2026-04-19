import { useEffect, useState } from "react";
import { Button, Spinner } from "@deliphone/ui";
import { Camera, RotateCcw, Check } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useAuthStore } from "@/stores/auth";

type Props = {
  fileType: string;
  submissionId: string;
  title: string;
  instruction: string;
  onUploaded: () => void;
};

export function KycPhotoStep({ fileType, submissionId, title, instruction, onUploaded }: Props) {
  const { videoRef, stream, photo, setPhoto, error, start, captureAsync, stop } =
    useCamera("environment");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  const handleCapture = async () => {
    const blob = await captureAsync();
    if (blob) setPhoto(blob);
  };

  const handleRetake = () => {
    setPhoto(null);
    setUploadError(null);
    start();
  };

  const handleConfirm = async () => {
    if (!photo) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", photo, `${fileType}.jpg`);

      const resp = await fetch(
        `/api/v1/client/me/kyc/upload?submission_id=${submissionId}&file_type=${fileType}`,
        {
          method: "POST",
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Ошибка загрузки: ${resp.status}`);
      }
      onUploaded();
    } catch (e: any) {
      setUploadError(e.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center text-center gap-16">
        <p className="body text-danger">{error}</p>
        <Button variant="ghost" onClick={start}>
          Попробовать снова
        </Button>
      </div>
    );
  }

  if (photo) {
    const previewUrl = URL.createObjectURL(photo);
    return (
      <div className="flex flex-col gap-16">
        <h2 className="h2 text-center">{title}</h2>
        <div className="relative rounded-lg overflow-hidden">
          <img src={previewUrl} alt="Фото" className="w-full" />
        </div>
        {uploadError && (
          <p className="body-sm text-danger text-center">{uploadError}</p>
        )}
        <div className="flex gap-12">
          <Button variant="ghost" fullWidth icon={RotateCcw} onClick={handleRetake}>
            Переснять
          </Button>
          <Button
            variant="primary"
            fullWidth
            icon={Check}
            loading={uploading}
            onClick={handleConfirm}
          >
            Подтвердить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <h2 className="h2 text-center">{title}</h2>
      <p className="body-sm text-ink-500 text-center">{instruction}</p>

      <div className="relative rounded-lg overflow-hidden bg-ink-900 aspect-[4/3]">
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size={32} />
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-8 border-2 border-white/40 rounded-lg pointer-events-none" />
      </div>

      <Button variant="primary" size="lg" fullWidth icon={Camera} onClick={handleCapture}>
        Сделать фото
      </Button>
    </div>
  );
}
