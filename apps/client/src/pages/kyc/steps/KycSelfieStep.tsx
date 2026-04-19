import { useEffect, useState } from "react";
import { Button, Spinner } from "@deliphone/ui";
import { Camera, RotateCcw, Check } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useAuthStore } from "@/stores/auth";

type Props = {
  submissionId: string;
  onUploaded: () => void;
};

export function KycSelfieStep({ submissionId, onUploaded }: Props) {
  const { videoRef, stream, photo, setPhoto, error, start, captureAsync, stop } =
    useCamera("user");
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
      formData.append("file", photo, "selfie.jpg");
      const resp = await fetch(
        `/api/v1/client/me/kyc/upload?submission_id=${submissionId}&file_type=selfie`,
        { method: "POST", body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!resp.ok) throw new Error(`Ошибка загрузки: ${resp.status}`);
      onUploaded();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center text-center gap-16">
        <p className="body text-danger">{error}</p>
        <Button variant="ghost" onClick={start}>Попробовать снова</Button>
      </div>
    );
  }

  if (photo) {
    const previewUrl = URL.createObjectURL(photo);
    return (
      <div className="flex flex-col gap-16">
        <h2 className="h2 text-center">Селфи с паспортом</h2>
        <div className="relative rounded-lg overflow-hidden">
          <img src={previewUrl} alt="Селфи" className="w-full" />
        </div>
        {uploadError && <p className="body-sm text-danger text-center">{uploadError}</p>}
        <div className="flex gap-12">
          <Button variant="ghost" fullWidth icon={RotateCcw} onClick={handleRetake}>Переснять</Button>
          <Button variant="primary" fullWidth icon={Check} loading={uploading} onClick={handleConfirm}>Подтвердить</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <h2 className="h2 text-center">Селфи с паспортом</h2>
      <p className="body-sm text-ink-500 text-center">Держи паспорт рядом с лицом</p>
      <div className="relative rounded-lg overflow-hidden bg-ink-900 aspect-[3/4]">
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center"><Spinner size={32} /></div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <div className="absolute inset-x-16 top-12 bottom-24 border-2 border-white/40 rounded-full pointer-events-none" />
      </div>
      <Button variant="primary" size="lg" fullWidth icon={Camera} onClick={handleCapture}>Сделать селфи</Button>
    </div>
  );
}
