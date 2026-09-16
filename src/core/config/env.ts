function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  enableAiCompliance: bool(import.meta.env.VITE_ENABLE_AI_COMPLIANCE),
  enablePhase2: bool(import.meta.env.VITE_ENABLE_PHASE_2),
  enablePushNotifications: bool(import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS),
  enablePaymentSandbox: bool(import.meta.env.VITE_ENABLE_PAYMENT_SANDBOX),
} as const;

export const isDev = env.appEnv === 'development';
