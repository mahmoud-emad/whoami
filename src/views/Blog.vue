<template>
  <div class="page-body">
    <div class="section mb-4">
      <h1>{{ pageTitle }}</h1>
      <v-alert v-if="pageIntro" class="pa-2 mt-2 mb-2 head-card">
        {{ pageIntro }}
      </v-alert>

      <!-- Owner-only: write a post from the blog itself rather than the dashboard. -->
      <div v-if="isAdmin" class="owner-bar">
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Write a new post"
          class="text-capitalize" @click="openCreate">New post</v-btn>
      </div>
      <v-alert v-if="isAdmin && !editorOpen && responseMessage" :type="responseType" variant="tonal"
        density="comfortable" class="mt-3">{{ responseMessage }}</v-alert>
    </div>

    <!-- Loading State -->
    <LoadingComponent type="article" :content-length="8" content-name="Blog Posts" v-if="apiLoading.isLoading()" />

    <!-- No Posts Found -->
    <v-alert class="pa-2 mt-2 mb-2 head-card" v-else-if="posts.length === 0">
      📭 No blog posts found.
    </v-alert>

    <!-- Blog Posts -->
    <div class="posts" v-else>
      <v-card class="post-card mb-4 head-card" :class="{ 'post-card--editable': isAdmin }" v-for="post in posts"
        :key="post.id" :style="{ background: 'transparent !important' }">
        <!-- Pinned to the card corner; the title gets extra right padding (only in the editable
             variant) so a long headline never runs under the buttons. -->
        <div v-if="isAdmin" class="post-card__actions">
          <InlineActions label="post" @edit="openEdit(post)" @remove="removePost(post)" />
        </div>
        <v-card-title>
          <p class="article-link">{{ post.title }}</p>
          <small class="published-date">Published on: {{ formatPostDate(post.createdAt || '') }}</small>
        </v-card-title>
        <v-btn @click="toggleContent(post.id || 0)" title="Read Blog Post" class="mb-4 ml-3" color="primary"
          variant="tonal">
          {{ expandedPosts[post.id || 0] ? 'Read Less' : 'Read More' }}
        </v-btn>
        <v-card-text class="mt-4" v-if="expandedPosts[post.id || 0]">
          <div class="markdown-content">
            <VMarkdownView :content="post.content" mode="transparent" />
          </div>
          <v-btn v-if="post.content.length > 1500" @click="toggleContent(post.id || 0)" title="Read Blog Post"
            color="primary" class="mt-4" variant="tonal">
            {{ expandedPosts[post.id || 0] ? 'Read Less' : 'Read More' }}
          </v-btn>
        </v-card-text>
      </v-card>
    </div>

    <!-- Create/edit shell. Reuses the same markdown editor the dashboard form uses, so posts written
         here and there go through identical tooling. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle" :max-width="900">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="nameRules({
          fieldName: 'Post Title',
          maxLength: 60,
          minLength: 10
        })" title="Post Title" label="Post Title" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <div class="md-editor-wrap mb-4">
          <VMarkdownEditor v-model="draft.content" locale="en" :upload-action="handleUpload" />
        </div>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving" class="text-capitalize"
          @click="savePost">{{ editingId === null ? 'Publish post' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading, useSettingsStore } from '../store';
import { PostType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone, nameRules } from '../utils';

import { VMarkdownView, VMarkdownEditor } from 'vue3-markdown';
import 'vue3-markdown/dist/style.css';

const emptyPost = (): PostType => ({ title: '', content: '' });

export default {
  name: 'Blog',
  components: { LoadingComponent, VMarkdownView, VMarkdownEditor, InlineActions, EditorDialog },
  setup() {
    const apiLoading = useAPILoading();
    const settingsStore = useSettingsStore();
    const posts = ref<PostType[]>([]);
    const errorMessage = ref<string | null>(null);
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    // In-place editing state. `editingId === null` means the dialog is writing a new post.
    const editorOpen = ref(false);
    const editingId = ref<number | null>(null);
    const draft = ref<PostType>(emptyPost());
    const validForm = ref(false);
    const saving = ref(false);

    const editorTitle = computed(() => (editingId.value === null ? 'New post' : 'Edit post'));

    // Page chrome: a default heading keeps the page usable before anything is configured.
    const page = computed(() => settingsStore.profile?.pages?.blog);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Blog Posts');
    const pageIntro = computed(() => page.value?.intro?.trim() || '');

    // Track which posts are expanded (each post has a boolean state)
    const expandedPosts = ref<Record<number, boolean>>({});

    onMounted(async () => {
      await loadPosts();
    });

    const loadPosts = async () => {
      try {
        apiLoading.setLoading(true);
        errorMessage.value = null;

        const res = await apiFetch(`/posts`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.message || 'Failed to fetch posts');
        }

        posts.value = result.total > 0 ? result.data : [];
      } catch (error) {
        console.error('Error loading posts:', error);
        errorMessage.value = 'Failed to load blog posts. Please try again later.';
      } finally {
        apiLoading.setLoading(false);
      }
    };

    // Toggle "Read More" state per post
    const toggleContent = (postId: number) => {
      expandedPosts.value[postId] = !expandedPosts.value[postId];
    };

    // Format Date Correctly
    const formatPostDate = (date: string) => {
      if (!date) return 'Unknown Date';
      const dateObj = new Date(date);
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    /**
     * Images are inlined as data URIs, the same as the dashboard's post form: the markdown body is
     * stored as a single JSON string, so an embedded image travels with it rather than depending on
     * a second upload endpoint staying in sync.
     */
    const handleUpload = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Failed to read file content.'));
        };
        reader.onerror = () => reject(new Error('Error occurred while reading the file.'));
        reader.readAsDataURL(file);
      });

    const openCreate = () => {
      clear();
      editingId.value = null;
      draft.value = emptyPost();
      editorOpen.value = true;
    };

    const openEdit = (post: PostType) => {
      clear();
      editingId.value = post.id ?? null;
      // Clone: the editor must not rewrite the post rendered behind the dialog as you type.
      draft.value = { ...emptyPost(), ...deepClone(post) };
      editorOpen.value = true;
    };

    const savePost = async () => {
      try {
        saving.value = true;
        const isNew = editingId.value === null;
        const result = await apiJson<{ message?: string }>(
          isNew ? '/posts' : `/posts/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        );
        editorOpen.value = false;
        success(result.message || (isNew ? 'Post published.' : 'Post updated.'));
        // Re-read rather than patch: the server owns id, createdAt and status.
        await loadPosts();
      } catch (e: any) {
        error(e?.message || 'Failed to save the post.');
      } finally {
        saving.value = false;
      }
    };

    const removePost = async (post: PostType) => {
      if (post.id === undefined) return;
      const snapshot = posts.value;
      posts.value = posts.value.filter((item) => item.id !== post.id);
      try {
        const result = await apiJson<{ message?: string }>(`/posts/${post.id}`, { method: 'DELETE' });
        success(result.message || 'Post deleted.');
      } catch (e: any) {
        posts.value = snapshot;
        error(e?.message || 'Failed to delete the post.');
      } finally {
        await loadPosts();
      }
    };

    return {
      formatPostDate,
      toggleContent,
      errorMessage,
      expandedPosts,
      apiLoading,
      posts,
      pageTitle,
      pageIntro,
      isAdmin,
      editorOpen,
      editorTitle,
      editingId,
      draft,
      validForm,
      saving,
      responseType,
      responseMessage,
      handleUpload,
      openCreate,
      openEdit,
      savePost,
      removePost,
      nameRules,
    };
  },
};
</script>

<style scoped>
.post-card {
  border-radius: 0px !important;
  margin: 0 auto;
}

.post-card-title {
  cursor: pointer;
}

.published-date {
  color: gray;
  font-size: 12px;
  display: block;
}

/* Ensures Markdown Formatting is Correct */
.markdown-content {
  white-space: pre-wrap;
}

/* ---- owner controls (never rendered signed out) ----------------------- */
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.post-card__actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
}

/* Only the editable variant reserves the space, so a visitor's title keeps the full width. */
.post-card--editable :deep(.v-card-title) {
  padding-right: 104px;
}

/* Same sizing the dashboard's post form uses: min-width:0 stops the editor refusing to shrink
   below its intrinsic width, which is what makes a phone scroll sideways. */
.md-editor-wrap {
  height: 350px;
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 600px) {
  .post-card--editable :deep(.v-card-title) {
    /* Full-screen dialog aside, the card is narrow here; the strip drops onto its own line. */
    padding-top: 44px;
    padding-right: 16px;
  }

  /* Editor and live preview sit side by side by default; at 390px that is two ~170px columns. */
  .md-editor-wrap {
    height: 60vh;
    min-height: 360px;
  }

  .md-editor-wrap :deep(.vmd-body) {
    flex-direction: column;
  }

  .md-editor-wrap :deep(.vmd-toolbar-icon) {
    padding: 8px;
    margin-left: 2px;
    margin-right: 2px;
  }
}
</style>
