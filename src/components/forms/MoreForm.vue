<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the More page from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Everything on the More page comes from here. A card only appears if it has a title and a link,
    so nothing on the page can point at something that does not exist.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-textarea v-model="more.intro" label="Intro paragraph" variant="outlined" hide-details="auto" rows="2" auto-grow
      class="mb-6"></v-textarea>

    <v-divider class="my-4" />

    <h3 class="section-title">🗂 Cards</h3>
    <p class="section-hint mb-3">The bigger entries at the top of the page.</p>

    <v-card v-for="(card, i) in more.cards" :key="`card-${i}`" variant="outlined" class="mb-3 pa-3">
      <!-- flex-wrap + ga-2 so the toggle and the remove button drop onto separate lines rather
           than overflowing the card on a narrow screen. -->
      <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-2">
        <v-switch v-model="card.show" color="primary" inset hide-details density="compact"
          :label="card.show ? 'Visible' : 'Hidden'"></v-switch>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" class="tap-target"
          :title="`Remove card ${i + 1}`" @click="more.cards.splice(i, 1)"></v-btn>
      </div>
      <v-text-field v-model="card.title" label="Title" variant="outlined" hide-details="auto"
        class="mb-2"></v-text-field>
      <v-textarea v-model="card.description" label="Description" variant="outlined" hide-details="auto" rows="2" auto-grow
        class="mb-2"></v-textarea>
      <v-text-field v-model="card.linkText" label="Link text" variant="outlined" hide-details="auto"
        class="mb-2"></v-text-field>
      <v-text-field v-model="card.link" label="Link (URL or /path)" variant="outlined" hide-details="auto"
        placeholder="https://…"></v-text-field>
    </v-card>

    <div class="form-actions mb-6">
      <v-btn @click="addCard" prepend-icon="mdi-plus" variant="tonal" color="primary">Add card</v-btn>
    </div>

    <v-divider class="my-4" />

    <h3 class="section-title">📦 Shoebox</h3>
    <p class="section-hint mb-3">Small links to old experiments and side projects.</p>

    <v-textarea v-model="more.shoeboxIntro" label="Shoebox intro" variant="outlined" hide-details="auto" rows="2" auto-grow
      class="mb-4"></v-textarea>

    <!-- Mobile-first columns: the two fields stack under 600px, sit side by side from sm, and only
         at md is there room for the show/remove controls to share the row. The controls used to be
         sm="2" — roughly 100px — which the toggle and the button together overflowed. -->
    <v-row v-for="(item, i) in more.shoebox" :key="`shoe-${i}`" class="ma-0 mb-2" align="center">
      <v-col cols="12" sm="6" md="5" class="pa-1">
        <v-text-field v-model="item.name" label="Name" variant="outlined" hide-details="auto"
          density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="6" md="5" class="pa-1">
        <v-text-field v-model="item.link" label="Link" variant="outlined" hide-details="auto"
          density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" md="2" class="pa-1 d-flex flex-wrap align-center ga-2">
        <v-switch v-model="item.show" color="primary" inset hide-details density="compact"
          :title="item.show ? 'Visible' : 'Hidden'"></v-switch>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" class="tap-target"
          :title="`Remove ${item.name || 'item'}`" @click="more.shoebox.splice(i, 1)"></v-btn>
      </v-col>
    </v-row>

    <div class="form-actions mb-6">
      <v-btn @click="addShoeboxItem" prepend-icon="mdi-plus" variant="tonal" color="primary">
        Add shoebox link
      </v-btn>
    </div>

    <v-divider class="my-4" />

    <div class="form-actions mb-4">
      <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save the More page" color="primary" variant="tonal">Save More page</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { MoreType } from '../../types';

const emptyMore = (): MoreType => ({ intro: '', cards: [], shoeboxIntro: '', shoebox: [] });

export default {
  name: 'MoreForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const more = ref<MoreType>(emptyMore());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.more;
        if (current) more.value = { ...emptyMore(), ...deepClone(current) };
      }
    });

    const addCard = () =>
      more.value.cards.push({ title: '', description: '', linkText: '', link: '', show: true });

    const addShoeboxItem = () => more.value.shoebox.push({ name: '', link: '', show: true });

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Only this form's slice is written back, so it cannot clobber the other profile sections.
        full.profile = { ...full.profile, more: more.value };
        await settingsStore.saveSettings(full);
        success('More page saved');
      } catch (e) {
        error('Failed to save the More page');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return { apiLoadingStore, more, responseType, responseMessage, addCard, addShoeboxItem, save };
  },
};
</script>

<style scoped>
.section-title {
  margin-top: 8px;
  margin-bottom: 4px;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}
</style>
