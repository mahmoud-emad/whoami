<template>
  <div class="page-body">
    <header class="section mb-4">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>

      <div v-if="isAdmin" class="owner-bar">
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Start a new list"
          class="text-capitalize" :disabled="busy" @click="openCreate">New list</v-btn>
        <v-alert v-if="!editorOpen && responseMessage" :type="responseType" variant="tonal" density="compact"
          class="owner-bar__alert">{{ responseMessage }}</v-alert>
      </div>
    </header>

    <LoadingComponent v-if="apiLoading.isLoading()" type="article" :content-length="3" content-name="Lists" />

    <v-alert v-else-if="!visible.length" class="pa-2 head-card" type="info" variant="tonal">
      {{ isAdmin ? 'No lists yet. Start one above.' : 'Nothing here yet.' }}
    </v-alert>

    <ul v-else class="list-cards">
      <li v-for="list in visible" :key="list.id" class="list-card"
        :class="{ 'list-card--parked': isAdmin && list.show === false }">
        <RouterLink class="list-card__link" :to="`/lists/${list.slug}`" :title="`Open ${list.title}`">
          <span class="list-card__head">
            <span v-if="list.emoji" class="list-card__emoji" aria-hidden="true">{{ list.emoji }}</span>
            <span class="list-card__title">{{ list.title }}</span>
            <span v-if="isAdmin && list.show === false" class="list-card__flag">HIDDEN</span>
          </span>
          <span v-if="list.intro" class="list-card__intro">{{ list.intro }}</span>

          <!-- The number is the point of a checklist, so it is the thing the card leads with. -->
          <span class="list-card__meta">
            <span class="list-card__count">{{ list.done }} / {{ list.total }}</span>
            <span class="list-card__bar" role="presentation">
              <span class="list-card__fill" :style="{ width: percent(list) + '%' }"></span>
            </span>
            <span class="list-card__missions">{{ list.missionCount }} {{ list.missionCount === 1 ? 'mission' :
              'missions' }}</span>
          </span>
        </RouterLink>

        <div v-if="isAdmin" class="list-card__tools">
          <InlineActions label="list" :edit="false" @remove="removeList(list)" />
        </div>
      </li>
    </ul>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" title="New list">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="requiredRule('Title')" label="Title" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.emoji" :rules="emojiRules()" label="Emoji" placeholder="🎯"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-textarea v-model="draft.intro" :rules="longTextRules({ fieldName: 'Intro', maxLength: 300 })"
          label="One line about it" variant="outlined" hide-details="auto" rows="2"
          auto-grow class="mb-4"></v-textarea>
      </v-form>
      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="createList">Create list</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
/**
 * Index of the owner's public checklists.
 *
 * A card per list, leading with how much of it is done — that number is the reason to keep a plan
 * in public at all. Following a card opens the list itself, where the boxes live.
 */
import { computed, defineComponent, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading, useSettingsStore } from '../store';
import type { ListSummary } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { emojiRules, longTextRules } from '../utils';

export default defineComponent({
  name: 'Lists',
  components: { RouterLink, LoadingComponent, InlineActions, EditorDialog },
  setup() {
    const apiLoading = useAPILoading();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const lists = ref<ListSummary[]>([]);
    const editorOpen = ref(false);
    const draft = ref({ title: '', emoji: '', intro: '' });
    const validForm = ref(false);
    const saving = ref(false);
    const busy = ref(false);

    // Page chrome falls back to a built-in heading, the same as every other page: a heading is UI,
    // an intro would be speaking for the owner.
    const page = computed(() => (settingsStore.profile?.pages as Record<string, { title?: string, intro?: string }>)?.lists);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Lists');
    const pageIntro = computed(() => page.value?.intro?.trim() || '');

    /** Hidden lists stay visible to the owner, dimmed, so one can be brought back from this page. */
    const visible = computed(() => lists.value.filter((l) => isAdmin.value || l.show !== false));

    const percent = (list: ListSummary): number =>
      list.total > 0 ? Math.round((list.done / list.total) * 100) : 0;

    const load = async () => {
      try {
        apiLoading.setLoading(true);
        const res = await apiFetch('/lists');
        const json = await res.json();
        lists.value = res.ok && Array.isArray(json.data) ? json.data : [];
      } catch {
        lists.value = [];
      } finally {
        apiLoading.setLoading(false);
      }
    };

    onMounted(load);

    const requiredRule = (field: string) => [(v: string) => Boolean((v || '').trim()) || `${field} is required`];

    const openCreate = () => {
      clear();
      draft.value = { title: '', emoji: '', intro: '' };
      editorOpen.value = true;
    };

    const createList = async () => {
      try {
        saving.value = true;
        const result = await apiJson<{ message?: string }>('/lists', {
          method: 'POST',
          body: JSON.stringify({ ...draft.value, northStar: '', missions: [], show: true }),
        });
        editorOpen.value = false;
        success(result.message || 'List created.');
        await load();
      } catch (e: unknown) {
        error(e instanceof Error ? e.message : 'Failed to create the list.');
      } finally {
        saving.value = false;
      }
    };

    const removeList = async (list: ListSummary) => {
      busy.value = true;
      const snapshot = lists.value;
      lists.value = lists.value.filter((l) => l.id !== list.id);
      try {
        const result = await apiJson<{ message?: string }>(`/lists/${list.slug}`, { method: 'DELETE' });
        success(result.message || 'List deleted.');
      } catch (e: unknown) {
        lists.value = snapshot;
        error(e instanceof Error ? e.message : 'Failed to delete the list.');
      } finally {
        busy.value = false;
      }
    };

    return {
      apiLoading, isAdmin, lists, visible, percent, pageTitle, pageIntro,
      editorOpen, draft, validForm, saving, busy, requiredRule,
      openCreate, createList, removeList, responseType, responseMessage,

      emojiRules,

      longTextRules,

    };
  },
});
</script>

<style scoped>
.list-cards {
  list-style: none;
  margin: 0;
  padding-left: 0 !important;
  display: grid;
  gap: 12px;
}

.list-card {
  position: relative;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 8px;
  background: rgb(var(--v-theme-box-bg-color));
  transition: border-color .15s ease;
}

.list-card:hover {
  border-color: rgb(var(--v-theme-link-hover-color));
}

.list-card--parked {
  opacity: 0.55;
}

.list-card__link {
  display: block;
  padding: 1rem 1.1rem;
  color: inherit !important;
  text-decoration: none;
}

.list-card__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.list-card__emoji {
  font-size: 1.1rem;
}

.list-card__title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-text-color));
}

.list-card__flag {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 4px;
  color: rgb(var(--v-theme-gray-color));
}

.list-card__intro {
  display: block;
  margin-top: 0.35rem;
  color: rgb(var(--v-theme-gray-color));
  line-height: 1.6;
}

.list-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.9rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: rgb(var(--v-theme-gray-color));
}

.list-card__count {
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  font-variant-numeric: tabular-nums;
}

.list-card__bar {
  flex: 1 1 100px;
  min-width: 80px;
  height: 4px;
  border-radius: 999px;
  background: rgb(var(--v-theme-form));
  overflow: hidden;
}

.list-card__fill {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link-hover-color));
  transition: width .3s ease;
}

/* Owner controls sit over the corner rather than inside the link, which would nest a button in
   an anchor and make the whole card un-clickable in the middle. */
.list-card__tools {
  position: absolute;
  top: 8px;
  right: 8px;
}

.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}
</style>
