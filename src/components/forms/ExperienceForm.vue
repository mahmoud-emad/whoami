<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the work history from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Every role on the home page comes from here. The order of the cards below is the order they render in —
    use the arrows to move a role up or down. "Currently here" drives the RUNNING / STOPPED marker.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-card v-for="(role, i) in experience" :key="`role-${i}`" variant="outlined" class="mb-4 pa-3">
      <!-- Header row: wraps on a phone so the reorder/delete buttons never overflow. -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <span class="role-index">Role {{ i + 1 }}</span>
        <div class="d-flex align-center ga-1">
          <v-btn icon="mdi-arrow-up" size="small" variant="text" :disabled="i === 0" title="Move this role up"
            aria-label="Move this role up" @click="moveRole(i, -1)"></v-btn>
          <v-btn icon="mdi-arrow-down" size="small" variant="text" :disabled="i === experience.length - 1"
            title="Move this role down" aria-label="Move this role down" @click="moveRole(i, 1)"></v-btn>
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" :title="`Remove role ${i + 1}`"
            aria-label="Remove this role" @click="experience.splice(i, 1)"></v-btn>
        </div>
      </div>

      <v-row class="ma-0">
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="role.org" label="Organisation" variant="outlined" hide-details="auto"
            density="comfortable"></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="role.title" label="Job title" variant="outlined" hide-details="auto"
            density="comfortable"></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="role.where" label="Where" variant="outlined" hide-details="auto"
            density="comfortable" hint="Remote, Cairo, Berlin …" persistent-hint></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="role.period" label="Period" variant="outlined" hide-details="auto"
            density="comfortable" hint="e.g. 2022 — now" persistent-hint></v-text-field>
        </v-col>
      </v-row>

      <div class="d-flex align-center flex-wrap ga-4 px-1 mt-3 mb-2">
        <v-switch v-model="role.active" color="primary" inset hide-details density="compact"
          :label="role.active ? 'Currently here (RUNNING)' : 'Past role (STOPPED)'"></v-switch>
        <v-switch v-model="role.show" color="primary" inset hide-details density="compact"
          :label="role.show ? 'Visible' : 'Hidden'"></v-switch>
      </div>

      <v-divider class="my-3" />

      <p class="section-hint mb-2">Bullet points — one line per thing you did.</p>

      <!-- Points use a row per bullet so the delete button stays reachable with a thumb. -->
      <div v-for="(_, p) in role.points" :key="`role-${i}-point-${p}`" class="d-flex align-center ga-1 mb-2">
        <v-textarea v-model="role.points[p]" :label="`Point ${p + 1}`" variant="outlined" hide-details="auto"
          density="comfortable" rows="2" auto-grow class="flex-grow-1"></v-textarea>
        <v-btn icon="mdi-close" size="small" variant="text" color="error" :title="`Remove point ${p + 1}`"
          aria-label="Remove this point" @click="role.points.splice(p, 1)"></v-btn>
      </div>

      <v-btn @click="addPoint(role)" prepend-icon="mdi-plus" variant="text" color="primary" size="small">
        Add point
      </v-btn>
    </v-card>

    <v-btn @click="addRole" prepend-icon="mdi-plus" variant="tonal" color="primary" class="mb-4" block>
      Add role
    </v-btn>

    <v-divider class="my-4" />

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the work history" class="mb-4" color="primary" variant="tonal">Save experience</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { ExperienceRole } from '../../types';

const emptyRole = (): ExperienceRole => ({
  org: '',
  title: '',
  where: '',
  period: '',
  active: false,
  points: [],
  show: true,
});

export default {
  name: 'ExperienceForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const experience = ref<ExperienceRole[]>([]);

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.experience;
        // Merge each role over an empty one so a config written before a field existed still edits cleanly.
        if (Array.isArray(current)) {
          experience.value = deepClone(current).map((r) => ({
            ...emptyRole(),
            ...r,
            points: Array.isArray(r?.points) ? r.points : [],
          }));
        }
      }
    });

    const addRole = () => experience.value.push(emptyRole());

    const addPoint = (role: ExperienceRole) => role.points.push('');

    /** Swap with the neighbour; array position is the render order, so this is the whole reorder story. */
    const moveRole = (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= experience.value.length) return;
      const list = experience.value;
      [list[index], list[target]] = [list[target], list[index]];
    };

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Only this form's slice is written back, so it cannot clobber the other profile sections.
        full.profile = { ...full.profile, experience: experience.value };
        await settingsStore.saveSettings(full);
        success('Experience saved');
      } catch (e) {
        error('Failed to save the experience');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      experience,
      responseType,
      responseMessage,
      addRole,
      addPoint,
      moveRole,
      save,
    };
  },
};
</script>

<style scoped>
.role-index {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-gray-color));
}

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}
</style>
