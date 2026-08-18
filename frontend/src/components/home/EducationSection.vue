<template>
  <div v-if="visible" class="education">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="section-intro">{{ intro }}</p>

    <OwnerBar>
      <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a qualification"
        class="text-capitalize" :disabled="busy" @click="openCreate">Add qualification</v-btn>
      <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
    </OwnerBar>

    <p v-if="isAdmin && !items.length" class="owner-hint">Nothing here yet — add the first one above.</p>

    <ul class="entries">
      <li v-for="(entry, index) in items" :key="`${entry.qualification}-${index}`" class="entry"
        :class="{ 'entry--parked': isAdmin && entry.show === false }">
        <p class="entry__qualification">
          {{ entry.qualification }}
          <StatusBadge v-if="isAdmin && entry.show === false" label="Hidden" title="Hidden from the public site" />
        </p>
        <p class="entry__meta">
          <span v-if="entry.institution">{{ entry.institution }}</span>
          <span v-if="entry.institution && entry.period" class="entry__dot">·</span>
          <span v-if="entry.period" class="entry__period">{{ entry.period }}</span>
        </p>

        <div v-if="isAdmin" class="entry__tools">
          <ReorderControls noun="qualification" :disabled="busy" :can-up="index > 0"
            :can-down="index < items.length - 1" @up="move(index, -1)" @down="move(index, 1)" />
          <InlineActions label="qualification" @edit="openEdit(index)" @remove="remove(index)" />
        </div>
      </li>
    </ul>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.qualification"
          :rules="nameRules({ fieldName: 'Qualification', maxLength: 120, minLength: 2 })" title="Qualification"
          label="Qualification" variant="outlined" hide-details="auto" class="mb-4"
          hint="Bachelor of …, MSc …, a certificate" persistent-hint></v-text-field>
        <v-text-field v-model="draft.institution"
          :rules="nameRules({ fieldName: 'Institution', maxLength: 120 })" title="Institution"
          label="Institution (optional)" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <!-- Free text with no rules: "2014 - 2018" and "expected 2027" are both valid answers. -->
        <v-text-field v-model="draft.period" :rules="nameRules({ fieldName: 'Period', maxLength: 40 })"
          title="Period" label="Period (optional)" variant="outlined" hide-details="auto" class="mb-4"
          hint="e.g. 2014 - 2018" persistent-hint></v-text-field>
        <v-switch v-model="draft.show" color="primary" inset hide-details density="compact"
          :label="draft.show ? 'Visible' : 'Hidden'"></v-switch>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="save">{{ editingIndex === null ? 'Add' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import OwnerBar from '../admin/OwnerBar.vue';
import StatusBadge from '../admin/StatusBadge.vue';
import FeedbackNote from '../admin/FeedbackNote.vue';
import InlineActions from '../admin/InlineActions.vue';
import ReorderControls from '../admin/ReorderControls.vue';
import EditorDialog from '../admin/EditorDialog.vue';
import { useSettingsStore } from '../../store';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';
import { useProfileList } from '../../composables/useProfileList';
import { deepClone, nameRules, sectionHeading } from '../../utils';
import type { EducationEntry } from '../../types';

const emptyEntry = (): EducationEntry => ({ qualification: '', institution: '', period: '', show: true });

/** Merge a stored entry over an empty one, so config written before a field existed still edits. */
const normalise = (entry?: Partial<EducationEntry> | null): EducationEntry => ({
  ...emptyEntry(),
  ...(entry || {}),
});

export default defineComponent({
  name: 'EducationSection',
  components: { OwnerBar, StatusBadge, FeedbackNote, InlineActions, ReorderControls, EditorDialog },

  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();
    const { items, busy, source, commit, setBusy } = useProfileList<EducationEntry>('education', normalise);

    const editorOpen = ref(false);
    const editingIndex = ref<number | null>(null);
    const draft = ref<EducationEntry>(emptyEntry());
    const validForm = ref(false);
    const saving = ref(false);

    const editorTitle = computed(() =>
      editingIndex.value === null ? 'Add qualification' : 'Edit qualification'
    );

    const section = computed(() => settingsStore.profile?.sections?.education);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    const visible = computed(
      () => section.value?.show !== false && (isAdmin.value || items.value.length > 0)
    );

    /** Save `next` and report. Returns false when the server refused, so callers can stay open. */
    const write = async (next: EducationEntry[], okMessage: string, failMessage: string) => {
      try {
        setBusy(true);
        await commit(next);
        success(okMessage);
        return true;
      } catch (e: any) {
        error(e?.message || failMessage);
        return false;
      } finally {
        setBusy(false);
      }
    };

    const openCreate = () => {
      clear();
      editingIndex.value = null;
      draft.value = emptyEntry();
      editorOpen.value = true;
    };

    const openEdit = (index: number) => {
      clear();
      const entry = items.value[index];
      if (!entry) return;
      editingIndex.value = index;
      draft.value = normalise(deepClone(entry));
      editorOpen.value = true;
    };

    const save = async () => {
      const next = source();
      const isNew = editingIndex.value === null;
      const entry = normalise(draft.value);
      entry.qualification = entry.qualification.trim();
      entry.institution = entry.institution.trim();
      entry.period = entry.period.trim();

      if (isNew || editingIndex.value! >= next.length) next.push(entry);
      else next[editingIndex.value!] = entry;

      saving.value = true;
      const ok = await write(next, isNew ? 'Added.' : 'Updated.', 'Failed to save that.');
      saving.value = false;
      if (ok) editorOpen.value = false;
    };

    const remove = async (index: number) => {
      const next = source();
      if (index < 0 || index >= next.length) return;
      next.splice(index, 1);
      await write(next, 'Deleted.', 'Failed to delete that.');
    };

    const move = async (index: number, delta: number) => {
      const next = source();
      const target = index + delta;
      if (index < 0 || index >= next.length || target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      await write(next, 'Order updated.', 'Failed to reorder.');
    };

    return {
      items,
      busy,
      visible,
      heading,
      sectionTitle,
      intro,
      isAdmin,
      editorOpen,
      editorTitle,
      editingIndex,
      draft,
      validForm,
      saving,
      responseType,
      responseMessage,
      openCreate,
      openEdit,
      save,
      remove,
      move,
      nameRules,
    };
  },
});
</script>

<style scoped>
.entries {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry {
  position: relative;
  padding: 0.5rem 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
}

.entry:first-child {
  border-top: none;
}

.entry__qualification {
  margin: 0;
  color: rgb(var(--v-theme-text-color));
  font-weight: 600;
}

/* Institution and dates are metadata, so they take the mono face the rest of the site gives it. */
.entry__meta {
  margin: 0.15rem 0 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8rem;
  color: rgb(var(--v-theme-gray-color));
}

.entry__dot {
  margin: 0 0.4rem;
}

.entry__tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.35rem;
}

.entry--parked {
  opacity: 0.55;
}

.owner-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  padding: 0.5rem 0;
}
</style>
