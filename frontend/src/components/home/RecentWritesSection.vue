<template>
  <!-- Hidden when there is nothing written yet, on the same reasoning as the articles section:
       an empty "Recent Writes" heading advertises a blog that looks abandoned. The owner still
       sees it, so the section can be configured before the first post exists. -->
  <div class="recent-writes mt-3" v-if="show && (isAdmin || loading || writes.length)">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="text-light-gray pa-2">{{ intro }}</p>

    <LoadingComponent type="article" :content-length="2" :content-name="sectionTitle || 'Recent Writes'"
      v-if="loading" />

    <div class="pa-2" v-else>
      <div v-if="writes.length">
        <v-row v-for="post in writes" :key="post.id" class="d-flex justify-space-between align-center">
          <v-col :cols="linkCols" class="d-flex justify-start align-center">
            <!--
              Router-link rather than <a>: this is the same app, and a full page load here would
              re-fetch settings and redraw the chrome to arrive at a page the router already has.
            -->
            <router-link :to="postLink(post)" class="article-link">
              <v-icon color="primary" size="20">mdi-fountain-pen-tip</v-icon>
              {{ post.title.length > 60 ? post.title.slice(0, 60) + '...' : post.title }}
            </router-link>
          </v-col>
          <v-col v-if="display.mdAndUp.value" :cols="dateCols" class="d-flex justify-end align-center">
            <p class="text-light-gray">{{ formatWriteDate(post.createdAt) }}</p>
          </v-col>
        </v-row>

        <!-- Only worth offering once there is more than this section is showing. -->
        <div v-if="hasMore" class="mt-2">
          <router-link to="/blog" class="all-link">Read the rest of the blog →</router-link>
        </div>
      </div>

      <!-- Owner-only: the section is mounted with nothing in it, which needs explaining. -->
      <p v-else-if="isAdmin" class="text-light-gray">
        Nothing published yet. Posts written on the blog show up here automatically.
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, ref, type Ref } from 'vue';
import { useDisplay } from 'vuetify';
import LoadingComponent from '../LoadingComponent.vue';
import { apiFetch } from '../../utils/api';
import { sectionHeading } from '../../utils';
import { useSettingsStore } from '../../store';
import { useAdmin } from '../../composables/useAdmin';
import type { PostType } from '../../types';
import { countVisible, selectRecentWrites } from './recentWrites';

export default {
  name: 'RecentWritesSection',
  components: { LoadingComponent },

  setup() {
    const display = useDisplay();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();

    /**
     * Local, not the shared `useAPILoading` store the older sections use. That store is a single
     * global boolean: two sections loading at once fight over it, and whichever finishes first
     * clears the other's skeleton. One flag per section cannot do that.
     */
    const loading = ref(true);
    const writes: Ref<PostType[]> = ref([]);
    const total = ref(0);

    const section = computed(() => settingsStore.profile?.sections?.recentWrites);
    const show = computed(() => section.value?.show !== false);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    // Same widths as the articles rows, minus the owner controls — posts are edited on the blog
    // itself, so there is nothing to act on here.
    const linkCols = computed(() => (display.mdAndUp.value ? 8 : 12));
    const dateCols = computed(() => 4);

    const hasMore = computed(() => total.value > writes.value.length);

    /**
     * Deep link to the post on the blog page. Blog.vue scrolls to this hash once its posts have
     * loaded; without a match it simply lands at the top of the blog, which is still the right
     * page.
     */
    const postLink = (post: PostType) => (post.id === undefined ? '/blog' : `/blog#post-${post.id}`);

    const formatWriteDate = (date?: string): string => {
      if (!date) return '';
      // Date only, no clock: the blog itself carries the full timestamp, and a teaser row that
      // reports the minute a post went up is noise.
      return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
    };

    const loadWrites = async () => {
      loading.value = true;
      try {
        const res = await apiFetch('/posts');
        const result = await res.json();
        if (!res.ok) {
          console.error('Error loading recent writes:', result.error);
          return;
        }
        const posts: PostType[] = result.total === 0 ? [] : result.data;
        total.value = countVisible(posts);
        writes.value = selectRecentWrites(posts);
      } catch (error) {
        console.error('Error loading recent writes:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadWrites);

    return {
      display,
      loading,
      writes,
      hasMore,
      show,
      heading,
      sectionTitle,
      intro,
      isAdmin,
      linkCols,
      dateCols,
      postLink,
      formatWriteDate,
    };
  },
};
</script>

<style scoped>
.all-link {
  color: rgb(var(--v-theme-primary));
  font-size: 0.9rem;
  text-decoration: none;
}

.all-link:hover {
  text-decoration: underline;
}
</style>
