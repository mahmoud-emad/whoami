<template>
  <v-alert v-if="responseMessage" :type="responseType" variant="tonal" class="mb-4">
    {{ responseMessage }}
  </v-alert>

  <!-- Deleting is irreversible, so the option has to stay legible on a phone: select-menu-wrap
       lets long post titles wrap rather than be clipped to an ellipsis. -->
  <v-select :loading="apiLoadingStore.isLoading()" :disabled="posts.length === 0" item-title="title" item-value="id"
    class="mb-4" label="Select post" variant="outlined" hide-details="auto" :items="posts"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedPostID">
  </v-select>

  <div class="form-actions mb-4">
    <v-btn @click="deleteSelectedPost" :disabled="posts.length === 0 || selectedPostID === null"
      title="When you press, the post will be deleted" color="error" variant="tonal">Delete</v-btn>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading } from '../../store';
import { type PostType } from '../../types';

import { useFormFeedback } from '../../composables/useFormFeedback';

export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error, info } = useFormFeedback();
    const posts = ref<PostType[]>([]);
    const selectedPostID = ref<number | null>(null);

    onMounted(async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/posts`);
        const result = await res.json();
        posts.value = result.data || [];
        if (posts.value.length === 0) info('No posts found');
      } catch (e) {
        error('Failed to load posts.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    });

    const deleteSelectedPost = async () => {
      if (selectedPostID.value === null) return;
      try {
        apiLoadingStore.setLoading(true);
        await apiFetch(`/posts/${selectedPostID.value}`, { method: 'DELETE' });
        posts.value = posts.value.filter((p) => p.id !== selectedPostID.value);
        selectedPostID.value = null;
        success('Post deleted successfully');
      } catch (e) {
        error('Failed to delete post.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      posts,
      selectedPostID,
      responseType,
      responseMessage,
      deleteSelectedPost,
    };
  },
};
</script>
