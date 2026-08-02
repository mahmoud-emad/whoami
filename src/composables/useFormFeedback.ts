import { ref, onScopeDispose } from 'vue';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

export const FEEDBACK_AUTOCLEAR_MS = 3000;

/**
 * Reactive feedback state for admin forms — replaces the responseType/responseMessage
 * pair (plus setTimeout dance) duplicated across every form. Success/info/warning
 * auto-clear so the alert disappears once the user has seen it; errors stick until
 * the next action so they don't vanish before being read.
 */
export function useFormFeedback() {
  const responseType = ref<FeedbackType>('success');
  const responseMessage = ref<string>('');
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stopTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const clear = () => {
    responseMessage.value = '';
    stopTimer();
  };

  const setAutoclear = (type: FeedbackType, message: string) => {
    responseType.value = type;
    responseMessage.value = message;
    stopTimer();
    timer = setTimeout(clear, FEEDBACK_AUTOCLEAR_MS);
  };

  const setSticky = (type: FeedbackType, message: string) => {
    responseType.value = type;
    responseMessage.value = message;
    stopTimer();
  };

  onScopeDispose(stopTimer);

  return {
    responseType,
    responseMessage,
    success: (msg: string) => setAutoclear('success', msg),
    info: (msg: string) => setAutoclear('info', msg),
    warning: (msg: string) => setAutoclear('warning', msg),
    error: (msg: string) => setSticky('error', msg),
    clear,
  };
}
