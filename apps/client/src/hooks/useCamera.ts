import { useRef, useState, useCallback } from "react";

type CameraMode = "environment" | "user";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCamera(preferredMode: CameraMode = "environment") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);

    const attempts = [
      { facingMode: { ideal: preferredMode } },
      { facingMode: { ideal: preferredMode === "environment" ? "user" : "environment" } },
      true,
    ];

    // Retry up to 3 times with increasing delay — gives the browser
    // time to release the previous camera stream between KYC steps.
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
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            await videoRef.current.play();
          }
          return; // success
        } catch {
          // try next constraint or retry
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
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const reset = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return { videoRef, stream, photo, setPhoto, error, start, captureAsync, stop, reset };
}
