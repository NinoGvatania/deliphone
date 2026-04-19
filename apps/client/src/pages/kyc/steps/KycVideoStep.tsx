import { useEffect, useState } from "react";
import { Button } from "@deliphone/ui";
import { Video, RotateCcw, Check } from "lucide-react";
import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { useAuthStore } from "@/stores/auth";

type Props = {
  submissionId: string;
  onUploaded: () => void;
};

export function KycVideoStep({ submissionId, onUploaded }: Props) {
  const { videoRef, recording, video, error, start, record, stop, reset } = useVideoRecorder(3000);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  const handleRetake = () => {
    reset();
    setUploadError(null);
    start();
  };

  const handleConfirm = async () => {
    if (!video) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", video, "video.webm");
      const resp = await fetch(
        `/api/v1/client/me/kyc/upload?submission_id=${submissionId}&file_type=video`,
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

  if (video) {
    const previewUrl = URL.createObjectURL(video);
    return (
      <div className="flex flex-col gap-16">
        <h2 className="h2 text-center">Видео записано</h2>
        <div className="rounded-lg overflow-hidden bg-ink-900">
          <video src={previewUrl} controls className="w-full" />
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
      <h2 className="h2 text-center">Запись видео</h2>
      <p className="body-sm text-ink-500 text-center">
        Посмотри в камеру, поверни голову влево-вправо, моргни
      </p>
      <div className="relative rounded-lg overflow-hidden bg-ink-900 aspect-[3/4]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        {recording && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-danger/90 text-white px-12 py-4 rounded-full">
            <div className="w-8 h-8 rounded-full bg-white animate-pulse" />
            <span className="caption font-semibold">REC</span>
          </div>
        )}
      </div>
      <Button variant="primary" size="lg" fullWidth icon={Video} disabled={recording} onClick={record}>
        {recording ? "Записываем..." : "Начать запись (3 сек)"}
      </Button>
    </div>
  );
}
