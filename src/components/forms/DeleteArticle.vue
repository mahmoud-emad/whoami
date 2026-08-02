<template>
  <v-alert v-if="responseMessage" :type="responseType" variant="tonal" class="mb-4">
    {{ responseMessage }}
  </v-alert>

  <!-- Deleting is irreversible, so the option has to stay legible on a phone: select-menu-wrap
       lets long article titles wrap rather than be clipped to an ellipsis. -->
  <v-select :loading="apiLoadingStore.isLoading()" :disabled="articles.length === 0" item-title="title" item-value="id"
    class="mb-4" label="Select article" variant="outlined" hide-details="auto" :items="articles"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedArticleID">
  </v-select>

  <div class="form-actions mb-4">
    <v-btn @click="deleteSelectedArticle" :disabled="articles.length === 0 || selectedArticleID === null"
      title="When you press, the article will be deleted" color="error" variant="tonal">Delete</v-btn>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading } from '../../store';
import { type ArticleType } from '../../types';

import { useFormFeedback } from '../../composables/useFormFeedback';

export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error, info } = useFormFeedback();
    const articles = ref<ArticleType[]>([]);
    const selectedArticleID = ref<number | null>(null);

    onMounted(async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/articles`);
        const result = await res.json();
        articles.value = result.data || [];
        if (articles.value.length === 0) info('No articles found');
      } catch (e) {
        error('Failed to load articles.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    });

    const deleteSelectedArticle = async () => {
      if (selectedArticleID.value === null) return;
      try {
        apiLoadingStore.setLoading(true);
        await apiFetch(`/articles/${selectedArticleID.value}`, { method: 'DELETE' });
        articles.value = articles.value.filter((a) => a.id !== selectedArticleID.value);
        selectedArticleID.value = null;
        success('Article deleted successfully');
      } catch (e) {
        error('Failed to delete article.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      articles,
      selectedArticleID,
      responseType,
      responseMessage,
      deleteSelectedArticle,
    };
  },
};
</script>
