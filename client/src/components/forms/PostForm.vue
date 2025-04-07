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
    <div class="mb-4">
      <VMarkdownEditor style="height: 350px;" v-model="content" locale="en" :upload-action="handleUpload" />
    </div>
    <!-- Save button - hidden in setup mode -->
    <v-btn v-if="!setupMode" :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()"
      title="Create Post" class="mb-4" color="primary" variant="tonal" @click="savePost">Create Post</v-btn>
  </v-form>
</template>

<script lang="ts">
import { ref, watch } from 'vue';
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
  props: {
    setupMode: {
      type: Boolean,
      default: false
    },
    introMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['settings-saved', 'form-data-changed'],
  setup(props, { emit }) {
    const validForm = ref(false);
    const content = ref('');
    const apiLoading = useAPILoading();
    const responseType = ref<'success' | 'error'>('success');
    const responseMessage = ref<string | undefined>();
    const post = ref<PostType>({
      title: '',
      content: '',
    });

    // Watch for changes and emit to parent
    watch([post, content], () => {
      const formData = {
        title: post.value.title,
        content: content.value
      };
      emit('form-data-changed', formData);
    }, { deep: true });

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

        // Update post content from markdown editor
        post.value.content = content.value;

        // For demo purposes, simulate a successful API call
        // In a real application, uncomment the API call below
        /*
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const res = await fetch(`${serverUrl}/posts`, {
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
          return;
        }
        */

        // Simulate success response for demo
        responseType.value = 'success';
        responseMessage.value = 'Post created successfully!';

        // Reset form after successful submission
        post.value = {
          title: '',
          content: '',
        };
        content.value = '';

        // Emit event to notify parent component that post was created
        emit('settings-saved');

      } catch (error) {
        console.error('Failed to create post:', error);
        responseType.value = 'error';
        responseMessage.value = 'Failed to save the post.';
      } finally {
        apiLoading.setLoading(false);
        if (responseType.value === 'success') {
          setTimeout(() => {
            responseMessage.value = undefined;
          }, 3000);
        }
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
      setupMode: props.setupMode
    };
  },
};
</script>
