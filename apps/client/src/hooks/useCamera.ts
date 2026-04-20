import { useRef, useState, useCallback, useEffect } from "react";

type CameraMode = "environment" | "user";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCamera(preferredMode: CameraMode = "environment") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount — always kills the stream
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);

    // Kill any existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);

    const attempts = [
      { facingMode: { ideal: preferredMode } },
      { facingMode: { ideal: preferredMode === "environment" ? "user" : "environment" } },
      true,
    ];

    for (let retry = 0; retry < 3; retry++) {
      if (retry > 0) await sleep(500 * retry);

      for (const videoConstraint of attempts) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: typeof videoConstraint === "boolean"
              ? videoConstraint
              : { ...videoConstraint, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
          streamRef.current = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            await videoRef.current.play();
          }
          return;
        } catch {
          // try next
        }
      }
    }

    setError("Не удалось открыть камеру. Проверь доступ в настройках браузера.");
  }, [preferredMode]);

  const captureAsync = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const reset = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return { videoRef, stream, photo, setPhoto, error, start, captureAsync, stop, reset };
}
