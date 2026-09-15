function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  enableAiCompliance: bool(process.env.EXPO_PUBLIC_ENABLE_AI_COMPLIANCE),
  enablePhase2: bool(process.env.EXPO_PUBLIC_ENABLE_PHASE_2),
  enablePushNotifications: bool(process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS),
  enablePaymentSandbox: bool(process.env.EXPO_PUBLIC_ENABLE_PAYMENT_SANDBOX),
} as const;

export const isDev = env.appEnv === 'development';
