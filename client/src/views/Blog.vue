<template>
  <div class="page-body">
    <div class="section mb-4">
      <h1>Blog Posts</h1>
      <v-alert v-if="posts && posts.length" class="pa-2 mt-2 mb-2 head-card">
        ✍️ Dive into My Blog: <strong>Insights</strong>, <strong>Tutorials</strong>, and <strong>Musings</strong>
      </v-alert>
    </div>

    <!-- Loading State -->
    <LoadingComponent type="article" :content-length="8" content-name="Blog Posts" v-if="apiLoading.isLoading()" />

    <!-- No Posts Found -->
    <div v-else-if="posts.length === 0" class="no-content-height">
      <v-alert class="pa-2 mt-2 mb-2 head-card">
        📭 No blog posts found.
      </v-alert>
    </div>

    <!-- Blog Posts -->
    <div class="posts" v-else>
      <v-card class="post-card mb-4 head-card" v-for="post in posts" :key="post.id"
        :style="{ background: 'transparent !important' }">
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
  </div>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading } from '../store';
import { PostType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import { VMarkdownView } from 'vue3-markdown';
import 'vue3-markdown/dist/style.css';

export default {
  name: 'CustomBlog',
  components: { LoadingComponent, VMarkdownView },
  setup() {
    const apiLoading = useAPILoading();
    const posts = ref<PostType[]>([]);
    const errorMessage = ref<string | null>(null);

    // Track which posts are expanded (each post has a boolean state)
    const expandedPosts = ref<Record<number, boolean>>({});

    onMounted(async () => {
      await loadPosts();
    });

    const loadPosts = async () => {
      try {
        apiLoading.setLoading(true);
        errorMessage.value = null;

        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const res = await fetch(`${serverUrl}/posts`);
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

    return {
      formatPostDate,
      toggleContent,
      errorMessage,
      expandedPosts,
      apiLoading,
      posts,
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
</style>
