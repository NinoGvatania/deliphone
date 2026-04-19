/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TG_BOT_USERNAME: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_YOOKASSA_WIDGET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
