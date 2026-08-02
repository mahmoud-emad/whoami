<template>
  <!-- Hidden when there are no articles: an empty section with a "none found" notice makes
       the site look half-built to a visitor who is evaluating you. -->
  <div class="articles mt-3" v-if="show && (isAdmin || apiLoadingStore.isLoading() || articles.length)">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="text-light-gray pa-2">{{ intro }}</p>

    <!-- Sits after the heading rather than wrapping it, so the signed-out layout is untouched. -->
    <div v-if="isAdmin" class="owner-bar pa-2">
      <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a new article"
        class="text-capitalize" @click="openCreate">New article</v-btn>
      <v-alert v-if="!editorOpen && responseMessage" :type="responseType" variant="tonal" density="compact"
        class="owner-bar__alert">{{ responseMessage }}</v-alert>
    </div>

    <LoadingComponent type="article" :content-length="2" :content-name="sectionTitle || 'Articles'"
      v-if="apiLoadingStore.isLoading()" />

    <div class="article pa-2" v-else>
      <div v-if="articles.length">
        <v-row v-for="(article, index) in articles" :key="index" class="d-flex justify-space-between align-center">
          <!-- The link gives up width to the controls only when they are actually rendered. -->
          <v-col :cols="linkCols" class="d-flex justify-start align-center">
            <a  target="_blank" :href="article.link" class="article-link">
              <v-icon color="primary" size="20">
                mdi-note-edit-outline
              </v-icon>
              {{ article.title.length > 60 ? article.title.slice(0, 60) + '...' : article.title }}
            </a>
          </v-col>
          <v-col v-if="display.mdAndUp.value" :cols="dateCols" class="d-flex justify-end align-center">
            <p class="text-light-gray">{{ formatData(article.createdAt!) }}</p>
          </v-col>
          <v-col v-if="isAdmin" :cols="actionCols" class="d-flex justify-end align-center">
            <InlineActions label="article" @edit="openEdit(article)" @remove="removeArticle(article)" />
          </v-col>
        </v-row>
      </div>

    </div>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="nameRules({
          fieldName: 'Article Title',
          maxLength: 120,
          minLength: 10
        })" title="Article Title" label="Article Title" variant="outlined" hide-details="auto"
          class="mb-4"></v-text-field>
        <v-text-field v-model="draft.link" type="url" :rules="websiteRules()" title="Article Link" label="Article Link"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <!-- Description is optional here, as in the dashboard form: the rules only apply once
             something has been typed, so an empty box is still a valid article. -->
        <v-textarea v-model="draft.description" :rules="draft.description?.length ? longTextRules({
          fieldName: 'Article Description',
          maxLength: 400,
          minLength: 20
        }) : []" :counter="400" title="Article Description" label="Article Description (optional)" variant="outlined"
          hide-details="auto" rows="3" auto-grow class="mb-4"></v-textarea>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving" class="text-capitalize"
          @click="saveArticle">{{ editingId === null ? 'Add article' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<style scoped>
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}
</style>

<script lang="ts">
import { computed, onMounted, Ref, ref } from 'vue';
import { apiFetch, apiJson } from '../../utils/api';
import { ArticleType } from '../../types';
import { useAPILoading, useSettingsStore } from '../../store';
import LoadingComponent from '../LoadingComponent.vue';
import InlineActions from '../admin/InlineActions.vue';
import EditorDialog from '../admin/EditorDialog.vue';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';
import { deepClone, formatData, longTextRules, nameRules, sectionHeading, websiteRules } from '../../utils';
import { useDisplay } from 'vuetify';

const emptyArticle = (): ArticleType => ({ title: '', link: '', description: '' });

export default {
  name: 'ArticlesSection',
  components: { LoadingComponent, InlineActions, EditorDialog },

  setup() {
    // Vuetify display utility
    const display = useDisplay();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    // In-place editing state. `editingId === null` means the dialog is creating a new article.
    const editorOpen = ref(false);
    const editingId = ref<number | null>(null);
    const draft = ref<ArticleType>(emptyArticle());
    const validForm = ref(false);
    const saving = ref(false);

    const editorTitle = computed(() => (editingId.value === null ? 'New article' : 'Edit article'));

    // Column widths. The signed-out values (8 / 4 / none) are exactly what they were before.
    const linkCols = computed(() => {
      if (display.mdAndUp.value) return isAdmin.value ? 6 : 8;
      return isAdmin.value ? 8 : 12;
    });
    const dateCols = computed(() => (isAdmin.value ? 3 : 4));
    const actionCols = computed(() => (display.mdAndUp.value ? 3 : 4));

    // Heading and intro are configuration, not copy baked into the template.
    const section = computed(() => settingsStore.profile?.sections?.articles);
    const show = computed(() => section.value?.show !== false);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    onMounted(async () => {
      await loadArticles();
    });

    const apiLoadingStore = useAPILoading()
    const articles: Ref<ArticleType[]> = ref([]);
    const page = ref(1)

    const loadArticles = async () => {
      apiLoadingStore.setLoading(true)
      try {
        const res = await apiFetch(`/articles`);
        const result = await res.json();
        if (res.ok) {
          // An empty result clears the list rather than bailing out, so deleting the last article
          // does not leave it on screen until the next full page load.
          articles.value = result.total === 0 ? [] : result.data;
        } else {
          console.error("Error adding article:", result.error);
        }
      } catch (error) {
        console.error("Error adding article:", error);
      }
      apiLoadingStore.setLoading(false)
    }

    const openCreate = () => {
      clear();
      editingId.value = null;
      draft.value = emptyArticle();
      editorOpen.value = true;
    };

    const openEdit = (article: ArticleType) => {
      clear();
      editingId.value = article.id ?? null;
      // Clone so the row behind the dialog is not rewritten while typing.
      draft.value = { ...emptyArticle(), ...deepClone(article) };
      editorOpen.value = true;
    };

    const saveArticle = async () => {
      try {
        saving.value = true;
        const isNew = editingId.value === null;
        const result = await apiJson<{ message?: string }>(
          isNew ? '/articles' : `/articles/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        );
        editorOpen.value = false;
        success(result.message || (isNew ? 'Article added.' : 'Article updated.'));
        await loadArticles();
      } catch (e: any) {
        error(e?.message || 'Failed to save the article.');
      } finally {
        saving.value = false;
      }
    };

    const removeArticle = async (article: ArticleType) => {
      if (article.id === undefined) return;
      // Optimistic removal, restored from the snapshot if the server refuses.
      const snapshot = articles.value;
      articles.value = articles.value.filter((item) => item.id !== article.id);
      try {
        const result = await apiJson<{ message?: string }>(`/articles/${article.id}`, { method: 'DELETE' });
        success(result.message || 'Article deleted.');
      } catch (e: any) {
        articles.value = snapshot;
        error(e?.message || 'Failed to delete the article.');
      } finally {
        await loadArticles();
      }
    };

    return {
      apiLoadingStore,
      articles,
      display,
      page,
      formatData,
      show,
      heading,
      sectionTitle,
      intro,
      isAdmin,
      editorOpen,
      editorTitle,
      editingId,
      draft,
      validForm,
      saving,
      linkCols,
      dateCols,
      actionCols,
      responseType,
      responseMessage,
      openCreate,
      openEdit,
      saveArticle,
      removeArticle,
      nameRules,
      websiteRules,
      longTextRules,
    };
  },
};
</script>
