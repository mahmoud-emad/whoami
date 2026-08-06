<template>
  <div class="page-body">
    <div class="section mb-4">
      <h1>{{ pageTitle }}</h1>
      <v-alert v-if="pageIntro" class="pa-2 mt-2 mb-2 head-card">
        {{ pageIntro }}
      </v-alert>

      <!-- Owner-only: write a post from the blog itself rather than the dashboard. -->
      <OwnerBar >
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Write a new post"
          class="text-capitalize" @click="openCreate">New post</v-btn>
      </OwnerBar>
      <FeedbackNote v-if="isAdmin && !editorOpen && responseMessage" :message="responseMessage" :type="responseType" class="mt-3" />
    </div>

    <!-- Loading State -->
    <LoadingComponent type="article" :content-length="8" content-name="Blog Posts" v-if="apiLoading.isLoading()" />

    <!-- No Posts Found -->
    <v-alert class="pa-2 mt-2 mb-2 head-card" v-else-if="posts.length === 0">
      📭 No blog posts found.
    </v-alert>

    <!-- Blog Posts -->
    <div class="posts" v-else>
      <v-card class="post-card mb-4 head-card"
        :class="{ 'post-card--editable': isAdmin, 'post-card--hidden': isAdmin && post.show === false }"
        v-for="post in posts"
        :key="post.id" :style="{ background: 'transparent !important' }">
        <!-- Pinned to the card corner; the title gets extra right padding (only in the editable
             variant) so a long headline never runs under the buttons. -->
        <div v-if="isAdmin" class="post-card__actions">
          <InlineActions label="post" pinnable :pinned="Boolean(post.pinnedAt)" hideable
            :hidden="post.show === false" @edit="openEdit(post)" @remove="removePost(post)"
            @toggle-pinned="askPin(post)" @toggle-hidden="toggleHidden(post)" />
        </div>
        <v-card-title>
          <p class="article-link">
            <!-- Shown to everyone, not just the owner: a post sitting above newer ones needs to
                 say why it is there. -->
            <StatusBadge v-if="isAdmin && post.show === false" label="Hidden"
              title="Hidden from the public blog" />
            <StatusBadge v-if="post.pinnedAt" label="Pinned" tone="accent" solid icon="mdi-pin"
              title="Pinned to the top" />
            {{ post.title }}
          </p>
          <small class="published-date">Published on: {{ formatPostDate(post.createdAt || '') }}</small>
        </v-card-title>
        <!--
          The post renders straight away. It used to be hidden entirely behind "Read More", so the
          listing was a column of titles with no way to tell what any of them were about. A long
          one is clipped with a fade instead, which keeps the page scannable without hiding the
          opening paragraph.
        -->
        <v-card-text>
          <div class="markdown-content post-body"
            :class="{ 'post-body--clipped': isLong(post) && !expandedPosts[post.id || 0] }">
            <MarkdownView :content="post.content" />
          </div>
          <div class="post-foot">
            <v-btn v-if="isLong(post)" @click="toggleContent(post.id || 0)"
              :title="expandedPosts[post.id || 0] ? 'Collapse this post' : 'Read the whole post'" color="primary"
              variant="tonal">
              {{ expandedPosts[post.id || 0] ? 'Read less' : 'Read more' }}
            </v-btn>
            <!-- Anyone can vote; there is nothing to sign in to. -->
            <PostVotes v-if="post.id !== undefined" :post-id="post.id" :initial="post.reactions || null" />
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!--
      Pinning changes what every reader sees first, so it asks in words rather than arming in
      place the way delete does.
    -->
    <ConfirmDialog v-if="isAdmin" v-model="pinDialog" :busy="pinning"
      :title="pinTarget?.pinnedAt ? 'Unpin this post?' : 'Pin this post?'" :subject="pinTarget?.title || ''"
      :message="pinTarget?.pinnedAt
        ? 'It will drop back among the other posts, in date order. Nothing else changes.'
        : 'It will move to the very top of the blog for everyone, above every other post, including any that are already pinned.'"
      :confirm-text="pinTarget?.pinnedAt ? 'Unpin' : 'Pin to top'" @confirm="confirmPin" />


    <!-- Create/edit shell. Reuses the same markdown editor the dashboard form uses, so posts written
         here and there go through identical tooling. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle" :max-width="900">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="nameRules({
          fieldName: 'Post Title',
          maxLength: 60,
          minLength: 10
        })" title="Post Title" label="Post Title" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <MarkdownEditor v-model="draft.content" class="mb-4" />
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
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import OwnerBar from '../components/admin/OwnerBar.vue';
import StatusBadge from '../components/admin/StatusBadge.vue';
import FeedbackNote from '../components/admin/FeedbackNote.vue';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading, useSettingsStore } from '../store';
import { PostType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import PostVotes from '../components/PostVotes.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import ConfirmDialog from '../components/admin/ConfirmDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone, nameRules } from '../utils';

// Async so markdown-it, DOMPurify and the editor stay out of the entry bundle: every view is
// statically routed, so a static import here would put all of it on the home page too.
const MarkdownView = defineAsyncComponent(() => import('../components/MarkdownView.vue'));
const MarkdownEditor = defineAsyncComponent(() => import('../components/admin/MarkdownEditor.vue'));

const emptyPost = (): PostType => ({ title: '', content: '' });

export default {
  name: 'Blog',
  components: { OwnerBar, StatusBadge, FeedbackNote, LoadingComponent, MarkdownView, MarkdownEditor, InlineActions, EditorDialog, ConfirmDialog, PostVotes },
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

    // Pin confirmation state. `pinTarget` is the post the open dialog is about.
    const pinDialog = ref(false);
    const pinTarget = ref<PostType | null>(null);
    const pinning = ref(false);

    const askPin = (post: PostType) => {
      clear();
      pinTarget.value = post;
      pinDialog.value = true;
    };

    /**
     * Write the pin and re-read the list.
     *
     * `pinnedAt` is set to now, so pinning something puts it above posts pinned earlier. Unpinning
     * clears it. Not optimistic: pinning reorders the whole page, and a list that reshuffles and
     * then reshuffles back on failure is worse than one that waits for the round trip.
     */
    const confirmPin = async () => {
      const post = pinTarget.value;
      if (!post || post.id === undefined) return;
      pinning.value = true;
      const wasPinned = Boolean(post.pinnedAt);
      try {
        const body = { ...post, pinnedAt: wasPinned ? null : new Date().toISOString() };
        delete body.reactions;
        await apiJson(`/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(body) });
        pinDialog.value = false;
        await loadPosts();
        success(wasPinned ? 'Post unpinned.' : 'Post pinned to the top.');
      } catch (e: any) {
        error(e?.message || 'Failed to change that.');
      } finally {
        pinning.value = false;
      }
    };

    /**
     * Take a post off the public blog, or put it back. Reversible, so unlike delete and unlike
     * pinning it fires on the first click — there is nothing to warn about.
     *
     * The list is re-read rather than patched in place: the server decides who sees a hidden post,
     * so its answer is the one worth rendering.
     */
    const toggleHidden = async (post: PostType) => {
      if (post.id === undefined) return;
      const nextShown = post.show === false;
      try {
        const body = { ...post, show: nextShown };
        delete body.reactions;
        await apiJson(`/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(body) });
        await loadPosts();
        success(nextShown ? 'Post is public again.' : 'Post hidden from the blog.');
      } catch (e: any) {
        error(e?.message || 'Failed to change that.');
      }
    };

    /**
     * Long enough to be worth clipping. Measured on the raw markdown rather than the rendered
     * height: the height is not known until after paint, and a threshold that moved as images
     * loaded would make the button appear and disappear under the reader.
     */
    const isLong = (post: PostType): boolean => (post.content || '').length > 1200;

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
      // `reactions` is dropped: it is computed per request from the vote table, and saving it back
      // would freeze a stale count onto the post record and shadow the real one.
      const editable = deepClone(post);
      delete editable.reactions;
      draft.value = { ...emptyPost(), ...editable };
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
      isLong,
      toggleHidden,
      pinDialog,
      pinTarget,
      pinning,
      askPin,
      confirmPin,
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
/* A hidden post stays on the owner's own listing, dimmed, because this page is where it is brought
   back from. Visitors never receive it at all — the server filters it out. */
.post-card--hidden {
  opacity: 0.55;
}







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
/* `white-space: pre-wrap` used to live here, from when the body was printed as plain text. It has
   to go now that the body is real markup: it turns every newline in the source into a line break,
   so a wrapped paragraph rendered with ragged breaks in the middle of sentences. */
.markdown-content {
  min-width: 0;
}

/* Read-more on the left, votes on the right, wrapping to two rows on a phone. */
/* Read more on the left, votes on the right — and the votes stay right whether or not the button
   is there. `justify-content: space-between` only looked correct while both children existed; on a
   short post, with the button absent, it pushed the lone votes control to the left instead. */
.post-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 1rem;
}

.post-foot :deep(.votes-wrap) {
  margin-left: auto;
}

/* A long post is clipped rather than hidden, so the opening still reads from the listing. */
.post-body--clipped {
  position: relative;
  max-height: 24rem;
  overflow: hidden;
}

/* The fade has to end in the page colour, not the card colour: the card is transparent. */
.post-body--clipped::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 6rem;
  background: linear-gradient(to bottom,
      rgba(var(--v-theme-background), 0),
      rgb(var(--v-theme-background)));
  pointer-events: none;
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

@media (max-width: 600px) {
  .post-card--editable :deep(.v-card-title) {
    /* Full-screen dialog aside, the card is narrow here; the strip drops onto its own line. */
    padding-top: 44px;
    padding-right: 16px;
  }

  /* Editor and live preview sit side by side by default; at 390px that is two ~170px columns. */

}
</style>
