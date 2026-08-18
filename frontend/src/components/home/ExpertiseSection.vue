<template>
  <!-- Nothing configured, nothing rendered — except for the owner, who would otherwise have no
       Add button to start from. -->
  <div v-if="visible" class="expertise">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="section-intro">{{ intro }}</p>

    <OwnerBar>
      <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add an area"
        class="text-capitalize" :disabled="busy" @click="openCreate">Add area</v-btn>
      <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
    </OwnerBar>

    <p v-if="isAdmin && !items.length" class="owner-hint">Nothing here yet — add the first area above.</p>

    <!--
      A definition list, not a table. The pairing is label-to-description, which is what <dl> means,
      and it reflows to one column on a phone without a table's horizontal scroll.
    -->
    <dl class="areas">
      <div v-for="(area, index) in items" :key="`${area.label}-${index}`" class="area"
        :class="{ 'area--parked': isAdmin && area.show === false }">
        <dt class="area__label">
          {{ area.label }}
          <StatusBadge v-if="isAdmin && area.show === false" label="Hidden" title="Hidden from the public site" />
        </dt>
        <dd class="area__detail">
          {{ area.detail }}
          <span v-if="isAdmin" class="area__tools">
            <ReorderControls noun="area" :disabled="busy" :can-up="index > 0"
              :can-down="index < items.length - 1" @up="move(index, -1)" @down="move(index, 1)" />
            <InlineActions label="area" @edit="openEdit(index)" @remove="remove(index)" />
          </span>
        </dd>
      </div>
    </dl>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.label" :rules="nameRules({ fieldName: 'Area', maxLength: 40, minLength: 2 })"
          title="Area" label="Area" variant="outlined" hide-details="auto" class="mb-4"
          hint="Software, Infrastructure, Languages …" persistent-hint></v-text-field>
        <v-textarea v-model="draft.detail"
          :rules="longTextRules({ fieldName: 'Detail', maxLength: 300, minLength: 3 })" :counter="300"
          title="Detail" label="What that covers" variant="outlined" hide-details="auto" rows="2" auto-grow
          class="mb-4"></v-textarea>
        <v-switch v-model="draft.show" color="primary" inset hide-details density="compact"
          :label="draft.show ? 'Visible' : 'Hidden'"></v-switch>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="save">{{ editingIndex === null ? 'Add area' : 'Save changes' }}</v-btn>
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
import { deepClone, longTextRules, nameRules, sectionHeading } from '../../utils';
import type { ExpertiseArea } from '../../types';

const emptyArea = (): ExpertiseArea => ({ label: '', detail: '', show: true });

/** Merge a stored area over an empty one, so config written before a field existed still edits. */
const normalise = (area?: Partial<ExpertiseArea> | null): ExpertiseArea => ({
  ...emptyArea(),
  ...(area || {}),
});

export default defineComponent({
  name: 'ExpertiseSection',
  components: { OwnerBar, StatusBadge, FeedbackNote, InlineActions, ReorderControls, EditorDialog },

  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();
    const { items, busy, source, commit, setBusy } = useProfileList<ExpertiseArea>('expertise', normalise);

    const editorOpen = ref(false);
    const editingIndex = ref<number | null>(null);
    const draft = ref<ExpertiseArea>(emptyArea());
    const validForm = ref(false);
    const saving = ref(false);

    const editorTitle = computed(() => (editingIndex.value === null ? 'Add area' : 'Edit area'));

    const section = computed(() => settingsStore.profile?.sections?.expertise);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    const visible = computed(
      () => section.value?.show !== false && (isAdmin.value || items.value.length > 0)
    );

    /** Save `next` and report. Returns false when the server refused, so callers can stay open. */
    const write = async (next: ExpertiseArea[], okMessage: string, failMessage: string) => {
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
      draft.value = emptyArea();
      editorOpen.value = true;
    };

    const openEdit = (index: number) => {
      clear();
      const area = items.value[index];
      if (!area) return;
      editingIndex.value = index;
      // Clone so typing in the dialog does not rewrite the row behind it before anything is saved.
      draft.value = normalise(deepClone(area));
      editorOpen.value = true;
    };

    const save = async () => {
      const next = source();
      const isNew = editingIndex.value === null;
      const area = normalise(draft.value);
      area.label = area.label.trim();
      area.detail = area.detail.trim();

      // Appending when the index no longer exists: the settings document could have been rewritten
      // elsewhere while the dialog was open, and writing past the end would leave a hole.
      if (isNew || editingIndex.value! >= next.length) next.push(area);
      else next[editingIndex.value!] = area;

      saving.value = true;
      const ok = await write(next, isNew ? 'Area added.' : 'Area updated.', 'Failed to save the area.');
      saving.value = false;
      if (ok) editorOpen.value = false;
    };

    const remove = async (index: number) => {
      const next = source();
      if (index < 0 || index >= next.length) return;
      next.splice(index, 1);
      await write(next, 'Area deleted.', 'Failed to delete the area.');
    };

    /** Swap with the neighbour; array position is the render order, so this is the whole reorder. */
    const move = async (index: number, delta: number) => {
      const next = source();
      const target = index + delta;
      if (index < 0 || index >= next.length || target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      await write(next, 'Order updated.', 'Failed to reorder the areas.');
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
      longTextRules,
    };
  },
});
</script>

<style scoped>
.areas {
  margin: 0;
  padding: 0;
}

/*
  Label column wide enough for the longest of them ("Infrastructure") and no wider, so the detail
  text starts at the same place on every row and the whole block reads as one aligned list.
*/
.area {
  display: grid;
  grid-template-columns: 10.5rem 1fr;
  gap: 0.35rem 1.25rem;
  padding: 0.5rem 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
}

.area:first-child {
  border-top: none;
}

.area__label {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-gray-color));
  padding-top: 0.15rem;
}

.area__detail {
  margin: 0;
  color: rgb(var(--v-theme-text-color));
  line-height: 1.6;
}

.area__tools {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  vertical-align: middle;
}

/* Parked rows stay legible but read as switched off, the same as a hidden role or post. */
.area--parked {
  opacity: 0.55;
}

.owner-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

/* One column on a phone: a 10.5rem label column next to prose leaves the text too narrow to read. */
@media (max-width: 600px) {
  .area {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }

  .area__label {
    padding-top: 0;
  }
}
</style>
