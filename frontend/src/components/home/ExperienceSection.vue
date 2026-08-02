<template>
  <!-- Nothing configured, nothing rendered: a heading over an empty work history is worse than no
       section at all.
       The owner is the exception — with no roles yet there would be nowhere to put the Add button,
       so for them the section stays on screen.
       No `mt-3` and no `pa-2` on the children either: Home.vue already sets the gap between
       sections, and the 8px utility padding indented this body away from its own heading. -->
  <div v-if="visible" class="experience">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>

    <p v-if="intro" class="section-intro">{{ intro }}</p>

    <!-- Sits after the heading rather than wrapping it, so the signed-out layout is untouched. -->
    <div v-if="isAdmin" class="owner-bar">
      <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a new role"
        class="text-capitalize" :disabled="busy" @click="openCreate">Add role</v-btn>
      <v-alert v-if="!editorOpen && responseMessage" :type="responseType" variant="tonal" density="compact"
        class="owner-bar__alert">{{ responseMessage }}</v-alert>
    </div>

    <p v-if="isAdmin && !roles.length" class="owner-hint">No roles yet — add the first one above.</p>

    <!--
      Rendered as a service list on purpose: the marker says current or past, and the order is
      time. It carries real information rather than being decoration bolted onto a plain list.
    -->
    <ol class="roles">
      <li v-for="(role, index) in roles" :key="`${role.org}-${index}`" class="role"
        :class="{ 'role--active': role.active, 'role--parked': isAdmin && role.show === false }">
        <span class="role__marker" aria-hidden="true"></span>

        <div class="role__head">
          <span class="role__org">{{ role.org }}</span>
          <span class="role__state">{{ role.active ? 'RUNNING' : 'STOPPED' }}</span>
          <!-- Owner-only badge: a parked role is invisible to visitors, so without this the owner
               would be looking at a role that is not actually on their site. -->
          <span v-if="isAdmin && role.show === false" class="role__parked">HIDDEN</span>
          <span class="role__period">{{ role.period }}</span>

          <!-- The whole strip is behind `isAdmin`, so a signed-out page emits exactly the markup it
               did before in-place editing existed. -->
          <div v-if="isAdmin" class="role__tools">
            <v-btn class="role__tool" variant="text" density="comfortable" icon="mdi-arrow-up"
              :disabled="busy || index === 0" title="Move this role up" aria-label="Move this role up"
              @click="moveRole(index, -1)"></v-btn>
            <v-btn class="role__tool" variant="text" density="comfortable" icon="mdi-arrow-down"
              :disabled="busy || index === roles.length - 1" title="Move this role down"
              aria-label="Move this role down" @click="moveRole(index, 1)"></v-btn>
            <InlineActions label="role" @edit="openEdit(index)" @remove="removeRole(index)" />
          </div>
        </div>

        <p class="role__title">{{ role.title }}<span v-if="role.where" class="role__where"> · {{ role.where }}</span>
        </p>

        <ul v-if="role.points && role.points.length" class="role__points">
          <li v-for="(point, i) in role.points" :key="i">{{ point }}</li>
        </ul>
      </li>
    </ol>

    <!-- Mounted only for the owner, so a visitor never loads the form at all. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-row class="ma-0">
          <v-col cols="12" sm="6" class="pa-0 pr-sm-2 mb-4">
            <v-text-field v-model="draft.org" :rules="nameRules({
              fieldName: 'Organisation',
              maxLength: 80,
              minLength: 2
            })" title="Organisation" label="Organisation" variant="outlined" hide-details="auto"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" class="pa-0 pl-sm-2 mb-4">
            <v-text-field v-model="draft.title" :rules="nameRules({
              fieldName: 'Job title',
              maxLength: 80,
              minLength: 2
            })" title="Job title" label="Job title" variant="outlined" hide-details="auto"></v-text-field>
          </v-col>
          <!-- Where and period are free text with no rules: "Remote" and "2022 — now" are as valid
               as a city and a pair of dates, and an empty one simply renders nothing. -->
          <v-col cols="12" sm="6" class="pa-0 pr-sm-2 mb-4">
            <v-text-field v-model="draft.where" :rules="nameRules({ fieldName: 'Where', maxLength: 80 })"
              title="Where" label="Where (optional)" variant="outlined"
              hide-details="auto" hint="Remote, Cairo, Berlin …" persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" class="pa-0 pl-sm-2 mb-4">
            <v-text-field v-model="draft.period" :rules="nameRules({ fieldName: 'Period', maxLength: 40 })"
              title="Period" label="Period (optional)" variant="outlined"
              hide-details="auto" hint="e.g. 2022 — now" persistent-hint></v-text-field>
          </v-col>
        </v-row>

        <div class="switch-row">
          <v-switch v-model="draft.active" color="primary" inset hide-details density="compact"
            :label="draft.active ? 'Currently here (RUNNING)' : 'Past role (STOPPED)'"></v-switch>
          <!-- `show` parks a role without deleting it, which is how the rest of the config models
               optional entries. -->
          <v-switch v-model="draft.show" color="primary" inset hide-details density="compact"
            :label="draft.show ? 'Visible' : 'Hidden'"></v-switch>
        </div>

        <v-divider class="my-3" />

        <p class="points-hint mb-2">Bullet points — one line per thing you did.</p>

        <!-- A row per bullet, so the remove button stays reachable with a thumb. -->
        <div v-for="(_, p) in draft.points" :key="`point-${p}`" class="point-row">
          <v-textarea v-model="draft.points[p]" :rules="longTextRules({ fieldName: 'Point', maxLength: 400 })"
            :label="`Point ${p + 1}`" variant="outlined" hide-details="auto"
            density="comfortable" rows="2" auto-grow class="flex-grow-1"></v-textarea>
          <v-btn class="point-row__remove" icon="mdi-close" variant="text" density="comfortable" color="error"
            :title="`Remove point ${p + 1}`" aria-label="Remove this point" @click="removePoint(p)"></v-btn>
        </div>

        <v-btn prepend-icon="mdi-plus" variant="text" color="primary" size="small" class="text-capitalize"
          @click="addPoint">Add point</v-btn>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving" class="text-capitalize"
          @click="saveRole">{{ editingIndex === null ? 'Add role' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useSettingsStore } from '../../store';
import type { ExperienceRole } from '../../types';
import { deepClone, longTextRules, nameRules, sectionHeading } from '../../utils';
import InlineActions from '../admin/InlineActions.vue';
import EditorDialog from '../admin/EditorDialog.vue';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';

const emptyRole = (): ExperienceRole => ({
  org: '',
  title: '',
  where: '',
  period: '',
  active: false,
  points: [],
  show: true,
});

/** Merge a stored role over an empty one, so a config written before a field existed still edits. */
const normalise = (role?: Partial<ExperienceRole> | null): ExperienceRole => {
  const points = role?.points;
  return {
    ...emptyRole(),
    ...(role || {}),
    // Hand-written config can leave `points` off entirely, or as something that is not a list.
    points: Array.isArray(points) ? points.filter((point) => typeof point === 'string') : [],
  };
};

export default defineComponent({
  name: 'ExperienceSection',
  components: { InlineActions, EditorDialog },
  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    // In-place editing state. `editingIndex === null` means the dialog is creating a new role.
    const editorOpen = ref(false);
    const editingIndex = ref<number | null>(null);
    const draft = ref<ExperienceRole>(emptyRole());
    const validForm = ref(false);
    const saving = ref(false);
    // Set while any write is in flight. Reorder and delete have no dialog of their own, so this is
    // what stops a second click landing before the first round trip has come back.
    const busy = ref(false);

    const editorTitle = computed(() => (editingIndex.value === null ? 'Add role' : 'Edit role'));

    const section = computed(() => settingsStore.profile?.sections?.experience);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    /**
     * The work history used to be a hardcoded array of one person's jobs. It now comes from
     * settings. `show === false` parks a role without deleting it, which is how the rest of the
     * config models optional entries.
     *
     * The owner sees parked roles too — otherwise a hidden role could never be brought back. That
     * also keeps the loop index equal to the index in settings, which is what edit, delete and
     * reorder address; for a visitor the list is filtered, but a visitor has no controls.
     */
    const roles = computed<ExperienceRole[]>(() => {
      const all = (settingsStore.profile?.experience || []).map((role) => normalise(role));
      return isAdmin.value ? all : all.filter((role) => role.show !== false);
    });

    const visible = computed(
      () => section.value?.show !== false && (isAdmin.value || roles.value.length > 0),
    );

    /** Editable copy of what settings holds right now, so nothing mutates the store in place. */
    const sourceRoles = (): ExperienceRole[] =>
      (deepClone(settingsStore.profile?.experience || []) as ExperienceRole[]).map((role) => normalise(role));

    /**
     * Experience is not a collection of its own — it is one array inside site settings, so there is
     * no `/experience` endpoint to POST to. Only the `profile.experience` slice is written back,
     * which is what stops this from clobbering whatever another form last saved.
     */
    const persist = async (nextRoles: ExperienceRole[]) => {
      const full = settingsStore.getSettings();
      full.profile = { ...full.profile, experience: nextRoles };
      await settingsStore.saveSettings(full);
    };

    /** Save `next` and report. Returns false when the server refused, so callers can stay open. */
    const commit = async (next: ExperienceRole[], okMessage: string, failMessage: string) => {
      try {
        busy.value = true;
        await persist(next);
        // No local mirror to reconcile: saveSettings pushes the saved document back into the store
        // and this section renders straight off it.
        success(okMessage);
        return true;
      } catch (e: any) {
        error(e?.message || failMessage);
        return false;
      } finally {
        busy.value = false;
      }
    };

    const openCreate = () => {
      clear();
      editingIndex.value = null;
      draft.value = emptyRole();
      editorOpen.value = true;
    };

    const openEdit = (index: number) => {
      clear();
      const role = roles.value[index];
      if (!role) return;
      editingIndex.value = index;
      // Clone so typing in the dialog does not rewrite the role behind it before anything is saved.
      draft.value = normalise(deepClone(role));
      editorOpen.value = true;
    };

    const addPoint = () => draft.value.points.push('');

    const removePoint = (index: number) => draft.value.points.splice(index, 1);

    const saveRole = async () => {
      const next = sourceRoles();
      const isNew = editingIndex.value === null;
      const role = normalise(draft.value);
      // Blank bullets are dropped rather than stored: an empty <li> renders as a stray bullet.
      role.points = role.points.map((point) => point.trim()).filter(Boolean);

      // Appending when the index no longer exists: the settings document could have been rewritten
      // elsewhere while the dialog was open, and writing past the end would leave a hole.
      if (isNew || editingIndex.value! >= next.length) next.push(role);
      else next[editingIndex.value!] = role;

      saving.value = true;
      const ok = await commit(next, isNew ? 'Role added.' : 'Role updated.', 'Failed to save the role.');
      saving.value = false;
      if (ok) editorOpen.value = false;
    };

    const removeRole = async (index: number) => {
      const next = sourceRoles();
      if (index < 0 || index >= next.length) return;
      next.splice(index, 1);
      await commit(next, 'Role deleted.', 'Failed to delete the role.');
    };

    /** Swap with the neighbour; array position is the render order, so this is the whole reorder. */
    const moveRole = async (index: number, delta: number) => {
      const next = sourceRoles();
      const target = index + delta;
      if (index < 0 || index >= next.length || target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      await commit(next, 'Order updated.', 'Failed to reorder the roles.');
    };

    return {
      roles,
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
      busy,
      responseType,
      responseMessage,
      openCreate,
      openEdit,
      saveRole,
      removeRole,
      moveRole,
      addPoint,
      removePoint,
      nameRules,

      longTextRules,

    };
  },
});
</script>

<style scoped>
.experience {
  min-width: 0;
}

/* Owner-only row under the heading. Wraps so the button never pushes the page sideways. */
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}

.owner-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
}

.roles {
  list-style: none;
  margin: 0;
  padding-left: 0 !important;
}

.role {
  position: relative;
  padding-left: 1.5rem;
  padding-bottom: 1.75rem;
}

.role:last-child {
  padding-bottom: 0;
}

/* The rail that links the markers — the supervision-tree read. */
.role::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 1.1rem;
  bottom: -0.25rem;
  width: 1px;
  background: rgb(var(--v-theme-border-color));
}

.role:last-child::before {
  display: none;
}

.role__marker {
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgb(var(--v-theme-gray-color));
  background: transparent;
}

.role--active .role__marker {
  border-color: rgb(var(--v-theme-link-hover-color));
  background: rgb(var(--v-theme-link-hover-color));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-link-hover-color), 0.18);
}

/* Owner-only: a parked role is dimmed so it reads as "not on the live page" at a glance. */
.role--parked {
  opacity: 0.55;
}

.role__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}

.role__org {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  /* A long organisation name is one unbroken string in mono; without these it widens the row and
     the whole page scrolls sideways on a phone. */
  min-width: 0;
  overflow-wrap: anywhere;
}

.role__state {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color));
}

.role--active .role__state {
  color: rgb(var(--v-theme-link-hover-color));
  border-color: rgba(var(--v-theme-link-hover-color), 0.45);
}

.role__parked {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px dashed rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color));
}

.role__period {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: rgb(var(--v-theme-gray-color));
  margin-left: auto;
}

/* Owner-only strip at the end of the header row. `align-self` because the row is baseline-aligned
   and an icon button has no text baseline to sit on. */
.role__tools {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  align-self: center;
}

.role__tool.v-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  color: rgb(var(--v-theme-text-color));
  opacity: 0.55;
}

.role__tool.v-btn:hover,
.role__tool.v-btn:focus-visible {
  opacity: 1;
}

.role__title {
  margin-top: 0.35rem !important;
  font-weight: 600;
  font-size: 0.95rem;
  color: rgb(var(--v-theme-text-color));
}

.role__where {
  font-weight: 400;
  color: rgb(var(--v-theme-gray-color));
}

.role__points {
  margin: 0.5rem 0 0 0;
  padding-left: 1.05rem;
}

.role__points li {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  line-height: 1.65;
  margin-bottom: 0.3rem;
}

/* Dialog: switches side by side on a wide screen, stacked once there is no room. */
.switch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
}

.points-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}

.point-row {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

/* Full 40px touch target, and pinned to the top of the row so it does not drift down as the
   textarea auto-grows. */
.point-row__remove.v-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  margin-top: 0.35rem;
}

@media (max-width: 600px) {
  .role__period {
    margin-left: 0;
    width: 100%;
  }

  .role__points li {
    font-size: 0.875rem;
  }

  /* At 390px the period already takes a full row, so the controls land on their own line; right
     aligning them keeps them clear of the bullet text below. */
  .role__tools {
    margin-left: auto;
  }
}
</style>
