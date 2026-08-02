<template>
  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-form v-model="validForm" :disabled="apiLoading.isLoading()" @submit.prevent="savePost">
    <v-text-field :rules="nameRules(
      {
        fieldName: 'Post Title',
        maxLength: 60,
        minLength: 10
      }
    )" v-model="post.title" title="Post Title" class="mb-4" label="Post Title" variant="outlined"
      hide-details="auto"></v-text-field>
    <!-- The height lives in CSS rather than an inline style so the mobile media query can win. -->
    <div class="md-editor-wrap mb-4">
      <VMarkdownEditor v-model="content" locale="en" :upload-action="handleUpload" />
    </div>
    <div class="form-actions mb-4">
      <v-btn :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()" title="Create Post"
        color="primary" variant="tonal" @click="savePost">Create Post</v-btn>
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

import { ref } from 'vue';
import { apiFetch } from '../../utils/api';
import { VMarkdownEditor } from 'vue3-markdown';
import 'vue3-markdown/dist/style.css';
import { useAPILoading } from '../../store';
import { PostType } from '../../types';
import { nameRules } from '../../utils';

export default {
  name: 'PostForm',
  components: {
    VMarkdownEditor,
  },
  setup() {
    const validForm = ref(false);
    const content = ref('');
    const apiLoading = useAPILoading();
    const responseType = ref<'success' | 'error'>('success');
    const responseMessage = ref<string | undefined>();
    const post = ref<PostType>({
      title: '',
      content: '',
    });

    // Handle file upload for VMarkdownEditor
    const handleUpload = (file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file content.'));
          }
        };
        reader.onerror = () => {
          reject(new Error('Error occurred while reading the file.'));
        };
        reader.readAsDataURL(file);
      });
    };

    const savePost = async () => {
      try {
        apiLoading.setLoading(true);
        post.value.content = content.value;
        const res = await apiFetch(`/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post.value),
        });

        const result = await res.json();
        if (res.ok) {
          responseType.value = 'success';
          responseMessage.value = result.message;
        } else {
          responseType.value = 'error';
          responseMessage.value = result.message;
          console.error('Error adding post:', result.error);
        }
      } catch (error) {
        console.error('Failed to write guestbook:', error);
        responseType.value = 'error';
        responseMessage.value = 'Failed to save the post.';
      } finally {
        apiLoading.setLoading(false);
        setTimeout(() => {
          responseType.value = 'success';
          responseMessage.value = undefined;
        }, 3000);
      }
    };

    return {
      content,
      apiLoading,
      responseMessage,
      responseType,
      post,
      validForm,
      handleUpload,
      savePost,
      nameRules,
    };
  },
};
</script>
