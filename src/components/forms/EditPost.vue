<template>
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <!-- Post titles run to 60 characters, which the menu would otherwise clip to an ellipsis on a
       phone and leave every option looking identical. -->
  <v-select :loading="apiLoading.isLoading()" :disabled="posts.length === 0" item-title="title" item-value="id"
    class="mb-4" label="Select post to edit" variant="outlined" hide-details="auto" :items="posts"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedPostID" @update:model-value="loadPost">
  </v-select>

  <v-form v-if="selectedPostID !== null" v-model="validForm" :disabled="apiLoading.isLoading()"
    @submit.prevent="savePost">
    <v-text-field :rules="nameRules({
      fieldName: 'Post Title',
      maxLength: 60,
      minLength: 10,
    })" v-model="post.title" title="Post Title" class="mb-4" label="Post Title" variant="outlined"
      hide-details="auto"></v-text-field>
    <!-- The height lives in CSS rather than an inline style so the mobile media query can win. -->
    <div class="md-editor-wrap mb-4">
      <VMarkdownEditor v-model="content" locale="en" :upload-action="handleUpload" />
    </div>
    <div class="form-actions mb-4">
      <v-btn :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()" title="Save Post"
        color="primary" variant="tonal" @click="savePost">Save Changes</v-btn>
    </div>
  </v-form>
</template>

<style scoped>
/* min-width:0 stops the editor refusing to shrink below its intrinsic content width, which is
   what made the whole dashboard scroll sideways on a phone. */
.md-editor-wrap {
  height: 350px;
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 600px) {
  /* The editor and its live preview sit side by side by default. At 390px that is two ~170px
     columns, which is unusable, so they stack and the block gets the height back. */
  .md-editor-wrap {
    height: 70vh;
    min-height: 420px;
  }

  .md-editor-wrap :deep(.vmd-body) {
    flex-direction: column;
  }

  /* The toolbar icons are ~16px; padding brings them up to a thumb-sized target. */
  .md-editor-wrap :deep(.vmd-toolbar-icon) {
    padding: 8px;
    margin-left: 2px;
    margin-right: 2px;
  }
}
</style>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { VMarkdownEditor } from 'vue3-markdown';
import 'vue3-markdown/dist/style.css';
import { useAPILoading } from '../../store';
import { PostType } from '../../types';
import { nameRules } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';

const emptyPost = (): PostType => ({ title: '', content: '' });

// VMarkdownEditor expects an upload handler that returns a Promise<string> with the
// inlineable URL for the dropped image. We base64 the file so the markdown is
// self-contained; switch to /upload if we want server-hosted images.
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file.'));
    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsDataURL(file);
  });

export default {
  name: 'EditPost',
  components: { VMarkdownEditor },
  setup() {
    const apiLoading = useAPILoading();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const content = ref('');
    const posts = ref<PostType[]>([]);
    const selectedPostID = ref<number | null>(null);
    const post = ref<PostType>(emptyPost());

    onMounted(async () => {
      try {
        apiLoading.setLoading(true);
        const res = await apiFetch(`/posts`);
        const result = await res.json();
        posts.value = result.data || [];
      } catch (e) {
        error('Failed to load posts.');
      } finally {
        apiLoading.setLoading(false);
      }
    });

    const loadPost = (id: number | null) => {
      if (id === null) return;
      const found = posts.value.find((p) => p.id === id);
      if (found) {
        post.value = { title: found.title, content: found.content || '' };
        content.value = found.content || '';
      }
    };

    const savePost = async () => {
      if (selectedPostID.value === null) return;
      try {
        apiLoading.setLoading(true);
        post.value.content = content.value;
        const res = await apiFetch(`/posts/${selectedPostID.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post.value),
        });
        const result = await res.json();
        if (res.ok) {
          success(result.message);
          const idx = posts.value.findIndex((p) => p.id === selectedPostID.value);
          if (idx !== -1) posts.value[idx] = result.data;
        } else {
          error(result.message || 'Failed to save the post.');
        }
      } catch (e) {
        error('Failed to save the post.');
      } finally {
        apiLoading.setLoading(false);
      }
    };

    return {
      apiLoading,
      posts,
      selectedPostID,
      content,
      responseType,
      responseMessage,
      post,
      validForm,
      handleUpload: fileToDataUrl,
      loadPost,
      savePost,
      nameRules,
    };
  },
};
</script>
