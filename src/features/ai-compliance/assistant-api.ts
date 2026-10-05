import { apiPost } from '@/core/api';

/** Mirrors StreetBiz-BE `VendorAssistantController` (AIC-09). Vendors only; advisory answers. */
export const MAX_QUESTION_LENGTH = 500;
export const MAX_CONTEXT_LENGTH = 1500;

export const assistantApi = {
  ask: (question: string, context?: string) =>
    apiPost<{ answer: string; isAiGenerated: boolean }>('/vendor/assistant', {
      question,
      context: context ? context.slice(-MAX_CONTEXT_LENGTH) : undefined,
    }),
};
