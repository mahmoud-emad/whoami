import { computed, ref, type ComputedRef } from 'vue';
import { useSettingsStore } from '../store';
import { useAdmin } from './useAdmin';
import { deepClone } from '../utils';
import type { ProfileType } from '../types';

/** Keys of the profile that hold an editable list of entries rendered as a home-page section. */
export type ProfileListKey = 'expertise' | 'education';

/** The shape every entry in such a list shares: `show` parks one without deleting it. */
export interface ProfileListEntry {
  show: boolean;
}

/**
 * Read/write access to one list inside site settings.
 *
 * The expertise grid and the education list are the same object with different fields: a list on
 * `profile`, filtered for visitors, edited in place by the owner, written back one slice at a time.
 * Writing that twice would be two copies of the same reconciliation rules, and the interesting part
 * — only ever sending back the slice you touched, so a save here cannot clobber whatever another
 * form last wrote — is exactly the part worth having in one place.
 *
 * ExperienceSection predates this and keeps its own copy; it is not worth destabilising a working
 * section to prove the point.
 */
export const useProfileList = <T extends ProfileListEntry>(
  key: ProfileListKey,
  normalise: (_raw?: Partial<T> | null) => T
): {
  items: ComputedRef<T[]>;
  hasAny: ComputedRef<boolean>;
  busy: ComputedRef<boolean>;
  source: () => T[];
  commit: (_next: T[]) => Promise<void>;
  setBusy: (_value: boolean) => void;
} => {
  const settingsStore = useSettingsStore();
  const { isAdmin } = useAdmin();
  const busy = ref(false);

  /**
   * Both lists are read through one generic, so the profile's own union of element types cannot
   * narrow to `T` on its own — `unknown` is the honest intermediate. `normalise` is what actually
   * makes the claim safe: every entry is merged over a complete default of the right shape, so a
   * field the stored object never had still comes out present and typed.
   */
  const entriesFor = (list: unknown): Partial<T>[] => (Array.isArray(list) ? (list as Partial<T>[]) : []);

  const all = computed<T[]>(() =>
    entriesFor((settingsStore.profile as ProfileType | undefined)?.[key]).map((entry) => normalise(entry))
  );

  /**
   * What to render. The owner sees parked entries too — otherwise a hidden one could never be
   * brought back — which also keeps the loop index equal to the index in settings, and that index
   * is what edit, delete and reorder address.
   */
  const items = computed<T[]>(() =>
    isAdmin.value ? all.value : all.value.filter((entry) => entry.show !== false)
  );

  const hasAny = computed<boolean>(() => items.value.length > 0);

  /** An editable copy of what settings holds right now, so nothing mutates the store in place. */
  const source = (): T[] =>
    entriesFor(deepClone((settingsStore.profile as ProfileType | undefined)?.[key] ?? [])).map((entry) =>
      normalise(entry)
    );

  /**
   * Write the list back. Only this slice of `profile` is replaced; everything else in the settings
   * document goes back exactly as it was read.
   */
  const commit = async (next: T[]): Promise<void> => {
    const full = settingsStore.getSettings();
    full.profile = { ...full.profile, [key]: next };
    await settingsStore.saveSettings(full);
  };

  return {
    items,
    hasAny,
    busy: computed(() => busy.value),
    source,
    commit,
    setBusy: (value: boolean) => {
      busy.value = value;
    },
  };
};
