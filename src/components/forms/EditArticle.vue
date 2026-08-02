<template>
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <!-- Article titles are allowed up to 120 characters, which the menu would otherwise clip to an
       ellipsis on a phone and leave every option looking identical. -->
  <v-select :loading="apiLoadingStore.isLoading()" :disabled="articles.length === 0" item-title="title" item-value="id"
    class="mb-4" label="Select article to edit" variant="outlined" hide-details="auto" :items="articles"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedArticleID" @update:model-value="loadArticle">
  </v-select>

  <v-form v-if="selectedArticleID !== null" @submit.prevent="saveArticle" v-model="validForm"
    :disabled="apiLoadingStore.isLoading()">
    <v-text-field :loading="apiLoadingStore.isLoading()" :rules="nameRules({
      fieldName: 'Article Title',
      maxLength: 120,
      minLength: 10,
    })" v-model="article.title" title="Article Title" class="mb-4" label="Article Title" variant="outlined"
      hide-details="auto"></v-text-field>
    <v-text-field type="url" :loading="apiLoadingStore.isLoading()" v-model="article.link" :rules="websiteRules()"
      title="Article Link" class="mb-4" label="Article Link" variant="outlined" hide-details="auto"></v-text-field>
    <v-textarea :loading="apiLoadingStore.isLoading()" type="text" :rules="article.description?.length ? longTextRules({
      fieldName: 'Article Description',
      maxLength: 400,
      minLength: 20,
    }) : []" :counter="400" v-model="article.description" title="Article Description" class="mb-4"
      label="Article Description" variant="outlined" hide-details="auto" rows="3" auto-grow></v-textarea>
    <div class="form-actions mb-4">
      <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm || apiLoadingStore.isLoading()"
        title="Save Article" @click="saveArticle" color="primary" variant="tonal">Save Changes</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { ArticleType } from '../../types';
import { nameRules, websiteRules, longTextRules, deepClone } from '../../utils';
import { useAPILoading } from '../../store';
import { useFormFeedback } from '../../composables/useFormFeedback';

const emptyArticle = (): ArticleType => ({ title: '', link: '', description: '' });

export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const articles = ref<ArticleType[]>([]);
    const selectedArticleID = ref<number | null>(null);
    const article = ref<ArticleType>(emptyArticle());

    onMounted(async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/articles`);
        const result = await res.json();
        articles.value = result.data || [];
      } catch (e) {
        error('Failed to load articles.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    });

    const loadArticle = (id: number | null) => {
      if (id === null) return;
      const found = articles.value.find((a) => a.id === id);
      if (found) article.value = deepClone(found);
    };

    const saveArticle = async () => {
      if (selectedArticleID.value === null) return;
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/articles/${selectedArticleID.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(article.value),
        });
        const result = await res.json();
        if (res.ok) {
          success(result.message);
          const idx = articles.value.findIndex((a) => a.id === selectedArticleID.value);
          if (idx !== -1) articles.value[idx] = result.data;
        } else {
          error(result.message || 'Failed to update article.');
        }
      } catch (e) {
        error('Failed to update article.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      articles,
      selectedArticleID,
      article,
      validForm,
      responseType,
      responseMessage,
      loadArticle,
      saveArticle,
      nameRules,
      websiteRules,
      longTextRules,
    };
  },
};
</script>
