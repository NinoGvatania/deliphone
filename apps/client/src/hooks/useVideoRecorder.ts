import { useRef, useState, useCallback } from "react";

export function useVideoRecorder(durationMs = 3000) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [video, setVideo] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch {
      setError("Не удалось открыть камеру.");
    }
  }, []);

  const record = useCallback(() => {
    if (!stream) return;
    setRecording(true);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      setVideo(new Blob(chunks, { type: "video/webm" }));
      setRecording(false);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  }, [stream, durationMs]);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const reset = useCallback(() => setVideo(null), []);

  return { videoRef, recording, video, error, start, record, stop, reset };
}
