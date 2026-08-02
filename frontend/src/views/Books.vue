<template>
  <div class="page-body books">
    <header class="books__head">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>

      <div v-if="isAdmin" class="owner-bar">
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a book"
          class="text-capitalize" :disabled="busy" @click="openCreate">Add book</v-btn>
        <v-alert v-if="!editorOpen && responseMessage" :type="responseType" variant="tonal" density="compact"
          class="owner-bar__alert">{{ responseMessage }}</v-alert>
      </div>
    </header>

    <LoadingComponent v-if="apiLoading.isLoading()" type="article" :content-length="5" content-name="Books" />

    <v-alert v-else-if="!books.length" class="pa-2 head-card" type="info" variant="tonal">
      {{ isAdmin ? 'No books yet. Add the first one above.' : 'Nothing on the shelf yet.' }}
    </v-alert>

    <template v-else>
      <section v-for="group in groups" :key="group.status" v-show="group.books.length" class="books__group">
        <h2 class="section-heading">{{ group.emoji }} {{ group.title }}</h2>
        <p v-if="group.intro" class="section-intro">{{ group.intro }}</p>

        <ul class="row-list">
          <li v-for="book in group.books" :key="book.id" class="row-list__item"
            :class="{ 'row-list__item--owned': isAdmin }">
            <a class="row-list__link book" :href="book.url" target="_blank" rel="noopener">
              <span class="book__main">
                <span class="row-list__title book__title">{{ book.title }}</span>
                <span class="book__by">{{ book.author }}<template v-if="book.year"> · {{ book.year }}</template></span>
                <span v-if="book.note" class="book__note">{{ book.note }}</span>
              </span>
              <!-- Progress only means anything on the book currently open. -->
              <span class="row-list__meta book__meta">{{ book.status === 'reading' && book.progress ? book.progress :
                readable(book.url) }}</span>
            </a>

            <div v-if="isAdmin" class="book__tools">
              <InlineActions label="book" @edit="openEdit(book)" @remove="removeBook(book)" />
            </div>
          </li>
        </ul>
      </section>
    </template>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editingId === null ? 'Add book' : 'Edit book'">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="requiredRule('Title')" label="Title" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.author" :rules="requiredRule('Author')" label="Author" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.url" :rules="requiredRule('Link')" label="Link" variant="outlined"
          hide-details="auto" hint="The book's own page — the publisher's or the author's, not a file."
          persistent-hint class="mb-4"></v-text-field>
        <v-row class="ma-0">
          <v-col cols="12" sm="6" class="pa-0 pr-sm-2 mb-4">
            <v-select v-model="draft.status" :items="STATUS_OPTIONS" item-title="label" item-value="value"
              label="Status" variant="outlined" hide-details="auto" density="comfortable"></v-select>
          </v-col>
          <v-col cols="12" sm="6" class="pa-0 pl-sm-2 mb-4">
            <v-text-field v-model="draft.year" label="Year or edition" placeholder="2nd ed. 2019" variant="outlined"
              hide-details="auto" density="comfortable"></v-text-field>
          </v-col>
        </v-row>
        <v-text-field v-model="draft.progress" label="Progress" placeholder="page 39" variant="outlined"
          hide-details="auto" hint="Only shown while the status is Reading now." persistent-hint
          class="mb-4"></v-text-field>
        <v-textarea v-model="draft.note" label="Note" variant="outlined" hide-details="auto" rows="2" auto-grow
          hint="Why it is here, or what it was good for." persistent-hint class="mb-4"></v-textarea>
      </v-form>
      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="saveBook">{{ editingId === null ? 'Add book' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
/**
 * The shelf.
 *
 * Grouped by where a book stands rather than listed flat: what is open right now is the only part
 * a visitor is likely to care about, and burying it in an alphabetical list would hide it.
 *
 * Rendered with the same row list the Contact page and the search results use, so a book reads as
 * the same kind of object as everything else on the site. No covers: a shelf where half the books
 * have a picture and half do not looks broken, and the link is the useful part anyway.
 */
import { computed, defineComponent, onMounted, ref } from 'vue';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading, useSettingsStore } from '../store';
import type { BookStatus, BookType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone } from '../utils';

const STATUS_OPTIONS: Array<{ value: BookStatus, label: string }> = [
  { value: 'reading', label: 'Reading now' },
  { value: 'read', label: 'Read' },
  { value: 'want', label: 'Want to read' },
];

const emptyBook = (): BookType => ({
  title: '', author: '', url: '', status: 'want', progress: '', note: '', year: '',
});

export default defineComponent({
  name: 'Books',
  components: { LoadingComponent, InlineActions, EditorDialog },
  setup() {
    const apiLoading = useAPILoading();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const books = ref<BookType[]>([]);
    const editorOpen = ref(false);
    const editingId = ref<number | null>(null);
    const draft = ref<BookType>(emptyBook());
    const validForm = ref(false);
    const saving = ref(false);
    const busy = ref(false);

    const page = computed(() =>
      (settingsStore.profile?.pages as Record<string, { title?: string, intro?: string }>)?.books);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Books');
    const pageIntro = computed(() => page.value?.intro?.trim() || '');

    /** Human-readable form of a URL: no scheme, no trailing slash. Same rule as the Contact rows. */
    const readable = (url: string): string =>
      (url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

    const byStatus = (status: BookStatus) => books.value.filter((b) => (b.status || 'want') === status);

    const groups = computed(() => [
      {
        status: 'reading' as BookStatus,
        emoji: '📖',
        title: 'Reading now',
        intro: '',
        books: byStatus('reading'),
      },
      {
        status: 'read' as BookStatus,
        emoji: '✅',
        title: 'Read',
        intro: '',
        books: byStatus('read'),
      },
      {
        status: 'want' as BookStatus,
        emoji: '🗂',
        title: 'On the shelf',
        intro: 'Queued up.',
        books: byStatus('want'),
      },
    ]);

    const load = async () => {
      try {
        apiLoading.setLoading(true);
        const res = await apiFetch('/books');
        const json = await res.json();
        books.value = res.ok && Array.isArray(json.data) ? json.data : [];
      } catch {
        books.value = [];
      } finally {
        apiLoading.setLoading(false);
      }
    };

    onMounted(load);

    const requiredRule = (field: string) => [(v: string) => Boolean((v || '').trim()) || `${field} is required`];

    const openCreate = () => {
      clear();
      editingId.value = null;
      draft.value = emptyBook();
      editorOpen.value = true;
    };

    const openEdit = (book: BookType) => {
      clear();
      editingId.value = book.id ?? null;
      draft.value = { ...emptyBook(), ...deepClone(book) };
      editorOpen.value = true;
    };

    const saveBook = async () => {
      try {
        saving.value = true;
        const isNew = editingId.value === null;
        const result = await apiJson<{ message?: string }>(
          isNew ? '/books' : `/books/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        );
        editorOpen.value = false;
        success(result.message || (isNew ? 'Book added.' : 'Book updated.'));
        await load();
      } catch (e: unknown) {
        error(e instanceof Error ? e.message : 'Failed to save the book.');
      } finally {
        saving.value = false;
      }
    };

    const removeBook = async (book: BookType) => {
      if (book.id === undefined) return;
      busy.value = true;
      const snapshot = books.value;
      books.value = books.value.filter((b) => b.id !== book.id);
      try {
        const result = await apiJson<{ message?: string }>(`/books/${book.id}`, { method: 'DELETE' });
        success(result.message || 'Book removed.');
      } catch (e: unknown) {
        books.value = snapshot;
        error(e instanceof Error ? e.message : 'Failed to remove the book.');
      } finally {
        busy.value = false;
      }
    };

    return {
      STATUS_OPTIONS, apiLoading, isAdmin, books, groups, readable,
      pageTitle, pageIntro, editorOpen, editingId, draft, validForm, saving, busy,
      requiredRule, openCreate, openEdit, saveBook, removeBook, responseType, responseMessage,
    };
  },
});
</script>

<style scoped>
.books__head {
  margin-bottom: 2rem;
}

.books__group {
  margin-bottom: 2.5rem;
}

.books__group:last-child {
  margin-bottom: 0;
}

/* The row keeps the site's list shape: title block on the left, muted metadata on the right. */
.book {
  align-items: flex-start !important;
  gap: 1rem;
}

.book__main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.book__title {
  display: block;
}

.book__by {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-gray-color));
}

.book__note {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgb(var(--v-theme-gray-color));
}

.book__meta {
  flex: 0 0 auto;
  white-space: nowrap;
  align-self: center;
}

.book__tools {
  display: flex;
  align-items: center;
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

/* On a phone the address is noise next to a wrapping title, so it steps out of the way. */
@media (max-width: 600px) {
  .book__meta {
    display: none;
  }

  .book {
    gap: 0.5rem;
  }
}
</style>
