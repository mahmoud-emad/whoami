<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the contact channels from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Every way a visitor can reach you, in the order shown here. <strong>Featured</strong> channels render as a
    large block at the top of the Contact page; the rest become compact rows underneath.
    A channel of kind <strong>email</strong> is turned into a <code>mailto:</code> link, so put the bare address
    in the URL field for that one.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-card v-for="(channel, i) in channels" :key="`channel-${i}`" variant="outlined" class="mb-4 pa-3">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <span class="channel-index">{{ channel.label || `Channel ${i + 1}` }}</span>
        <div class="d-flex align-center ga-1">
          <v-btn icon="mdi-arrow-up" size="small" variant="text" :disabled="i === 0" title="Move this channel up"
            aria-label="Move this channel up" @click="moveChannel(i, -1)"></v-btn>
          <v-btn icon="mdi-arrow-down" size="small" variant="text" :disabled="i === channels.length - 1"
            title="Move this channel down" aria-label="Move this channel down" @click="moveChannel(i, 1)"></v-btn>
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" :title="`Remove channel ${i + 1}`"
            aria-label="Remove this channel" @click="channels.splice(i, 1)"></v-btn>
        </div>
      </div>

      <v-row class="ma-0">
        <v-col cols="12" sm="6" class="pa-1">
          <v-select v-model="channel.kind" :items="kinds" label="Kind" variant="outlined" hide-details="auto"
            density="comfortable"></v-select>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="channel.label" label="Label" variant="outlined" hide-details="auto"
            density="comfortable" hint="What the link says, e.g. “@me on GitHub”" persistent-hint></v-text-field>
        </v-col>
        <v-col cols="12" class="pa-1">
          <v-text-field v-model="channel.url" label="URL" variant="outlined" hide-details="auto"
            density="comfortable"
            :hint="channel.kind === 'email' ? 'Plain address — it is wrapped in mailto: for you' : 'https://…'"
            persistent-hint></v-text-field>
        </v-col>
        <v-col cols="12" class="pa-1">
          <v-textarea v-model="channel.description" label="Description" variant="outlined" hide-details="auto"
            density="comfortable" rows="2" auto-grow></v-textarea>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="channel.icon" label="Icon" variant="outlined" hide-details="auto"
            density="comfortable" placeholder="mdi-github" hint="Any Material Design Icon name, e.g. mdi-github"
            persistent-hint></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1 d-flex align-center flex-wrap ga-4">
          <v-switch v-model="channel.featured" color="primary" inset hide-details density="compact"
            :label="channel.featured ? 'Featured block' : 'Compact row'"></v-switch>
          <v-switch v-model="channel.show" color="primary" inset hide-details density="compact"
            :label="channel.show ? 'Visible' : 'Hidden'"></v-switch>
        </v-col>
      </v-row>
    </v-card>

    <v-btn @click="addChannel" prepend-icon="mdi-plus" variant="tonal" color="primary" class="mb-4" block>
      Add channel
    </v-btn>

    <v-divider class="my-4" />

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the contact channels" class="mb-4" color="primary" variant="tonal">Save channels</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { ContactChannel } from '../../types';

/** `kind` is a free string in the schema; this list is the curated set the Contact page knows icons for. */
const KINDS = [
  'email',
  'signal',
  'github',
  'linkedin',
  'x',
  'mastodon',
  'bluesky',
  'website',
  'other',
];

const emptyChannel = (): ContactChannel => ({
  kind: 'website',
  label: '',
  url: '',
  description: '',
  icon: '',
  featured: false,
  show: true,
});

export default {
  name: 'ChannelsForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const channels = ref<ContactChannel[]>([]);

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.channels;
        // Merge each entry over an empty one so a config missing a newer field still edits cleanly.
        if (Array.isArray(current)) {
          channels.value = deepClone(current).map((c) => ({ ...emptyChannel(), ...c }));
        }
      }
    });

    const addChannel = () => channels.value.push(emptyChannel());

    /** Array position is the render order, so swapping with a neighbour is the whole reorder story. */
    const moveChannel = (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= channels.value.length) return;
      const list = channels.value;
      [list[index], list[target]] = [list[target], list[index]];
    };

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Only this form's slice is written back, so it cannot clobber the other profile sections.
        full.profile = { ...full.profile, channels: channels.value };
        await settingsStore.saveSettings(full);
        success('Channels saved');
      } catch (e) {
        error('Failed to save the channels');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      channels,
      kinds: KINDS,
      responseType,
      responseMessage,
      addChannel,
      moveChannel,
      save,
    };
  },
};
</script>

<style scoped>
.channel-index {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  /* A long label must wrap rather than push the delete buttons off a 390px screen. */
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
