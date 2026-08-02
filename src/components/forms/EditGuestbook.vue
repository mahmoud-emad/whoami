<template>
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <!-- select-menu-wrap keeps long signer names readable in the teleported menu instead of
       truncating them to an ellipsis on a narrow screen. -->
  <v-select :loading="apiLoadingStore.isLoading()" :disabled="guestbooks.length === 0" item-title="name" item-value="id"
    class="mb-4" label="Select guestbook to edit" variant="outlined" hide-details="auto" :items="guestbooks"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedGuestbookID"
    @update:model-value="loadGuestbook">
  </v-select>

  <v-form v-if="selectedGuestbookID !== null" v-model="validForm" :disabled="apiLoadingStore.isLoading()">
    <v-text-field :rules="nameRules({
      fieldName: 'Name',
      maxLength: 60,
      minLength: 2,
    })" v-model="guestbook.name" title="Name" class="mb-4" label="Name" variant="outlined"
      hide-details="auto"></v-text-field>
    <v-textarea :rules="longTextRules({
      fieldName: 'Message',
      maxLength: 400,
      minLength: 2,
    })" :counter="400" v-model="guestbook.message" title="Message" class="mb-4" label="Message" variant="outlined"
      hide-details="auto" rows="3" auto-grow></v-textarea>
    <v-text-field type="url" v-model="guestbook.website" :rules="guestbook.website?.length ? websiteRules() : []"
      title="Website (optional)" class="mb-4" label="Website (optional)" variant="outlined"
      hide-details="auto"></v-text-field>
    <div class="form-actions mb-4">
      <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm || apiLoadingStore.isLoading()"
        @click="saveGuestbook" title="Save Guestbook" color="primary" variant="tonal">Save Changes</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { GuestBookType } from '../../types';
import { nameRules, longTextRules, websiteRules } from '../../utils';
import { useAPILoading } from '../../store';
import { useFormFeedback } from '../../composables/useFormFeedback';

const emptyGuestbook = (): GuestBookType => ({ name: '', message: '', website: '' });

export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const guestbooks = ref<GuestBookType[]>([]);
    const selectedGuestbookID = ref<number | null>(null);
    const validForm = ref(false);
    const guestbook = ref<GuestBookType>(emptyGuestbook());

    onMounted(async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/guestbooks`);
        const result = await res.json();
        guestbooks.value = result.data || [];
      } catch (e) {
        error('Failed to load guestbooks.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    });

    const loadGuestbook = (id: number | null) => {
      if (id === null) return;
      const found = guestbooks.value.find((g) => g.id === id);
      if (found) {
        guestbook.value = {
          name: found.name,
          message: found.message,
          website: found.website || '',
        };
      }
    };

    const saveGuestbook = async () => {
      if (selectedGuestbookID.value === null) return;
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/guestbooks/${selectedGuestbookID.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestbook.value),
        });
        const result = await res.json();
        if (res.ok) {
          success(result.message);
          const idx = guestbooks.value.findIndex((g) => g.id === selectedGuestbookID.value);
          if (idx !== -1) guestbooks.value[idx] = result.data;
        } else {
          error(result.message || 'Failed to update guestbook.');
        }
      } catch (e) {
        error('Failed to update guestbook.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      guestbooks,
      selectedGuestbookID,
      guestbook,
      validForm,
      responseType,
      responseMessage,
      loadGuestbook,
      saveGuestbook,
      nameRules,
      longTextRules,
      websiteRules,
    };
  },
};
</script>
