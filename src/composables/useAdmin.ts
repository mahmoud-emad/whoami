import { computed, ref } from 'vue';
import { getToken, verifySession } from '../utils/api';

/**
 * Whether the visitor is signed in as the site owner.
 *
 * Module-level state, so every component that asks shares one answer rather than each holding its
 * own copy that can drift. The initial value is read optimistically from the stored token so the
 * editing controls do not flash in and out on the first paint; `refresh()` then asks the server
 * whether that token is actually still valid.
 *
 * This only drives what the UI offers. Every write is authorised again on the server, so a visitor
 * flipping this flag in devtools gets buttons that return 401.
 */
const authed = ref<boolean>(Boolean(getToken()));

export function useAdmin() {
  const isAdmin = computed(() => authed.value);

  /** Ask the server whether the stored token is still good. Safe to call repeatedly. */
  const refresh = async (): Promise<boolean> => {
    authed.value = await verifySession();
    return authed.value;
  };

  const markSignedIn = () => {
    authed.value = true;
  };

  const markSignedOut = () => {
    authed.value = false;
  };

  return { isAdmin, refresh, markSignedIn, markSignedOut };
}
