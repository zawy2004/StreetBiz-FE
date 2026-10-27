/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_AI_COMPLIANCE?: string;
  readonly VITE_ENABLE_CHATBOT?: string;
  readonly VITE_ENABLE_PHASE_2?: string;
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS?: string;
  readonly VITE_ENABLE_PAYMENT_SANDBOX?: string;
  readonly VITE_CITY_FEEDBACK_PHONE?: string;
  readonly VITE_CITY_FEEDBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
