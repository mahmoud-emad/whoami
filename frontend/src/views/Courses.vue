<template>
  <div class="page-body courses">
    <header class="courses__head">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>

      <OwnerBar>
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a course"
          class="text-capitalize" :disabled="busy" @click="openCreate">Add course</v-btn>
        <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
      </OwnerBar>
    </header>

    <LoadingComponent v-if="apiLoading.isLoading()" type="article" :content-length="5" content-name="Courses" />

    <v-alert v-else-if="!courses.length" class="pa-2 head-card" type="info" variant="tonal">
      {{ isAdmin ? 'No courses yet. Add the first one above.' : 'Nothing here yet.' }}
    </v-alert>

    <template v-else>
      <section v-for="group in groups" :key="group.status" v-show="group.courses.length" class="courses__group">
        <h2 class="section-heading">{{ group.emoji }} {{ group.title }}</h2>
        <p v-if="group.intro" class="section-intro">{{ group.intro }}</p>

        <ul class="row-list">
          <li v-for="course in group.courses" :key="course.id" class="row-list__item"
            :class="{ 'row-list__item--owned': isAdmin }">
            <a class="row-list__link course" :href="course.url" target="_blank" rel="noopener">
              <span class="course__main">
                <span class="row-list__title course__title">{{ course.title }}</span>
                <span class="course__by">{{ course.provider
                  }}<template v-if="course.year"> · {{ course.year }}</template></span>
                <span v-if="course.note" class="course__note">{{ course.note }}</span>
              </span>
              <!-- Progress only means anything on the course currently being watched. -->
              <span class="row-list__meta course__meta">{{ course.status === 'watching' && course.progress ?
                course.progress : readable(course.url) }}</span>
            </a>

            <div v-if="isAdmin" class="course__tools">
              <InlineActions label="course" @edit="openEdit(course)" @remove="removeCourse(course)" />
            </div>
          </li>
        </ul>
      </section>
    </template>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editingId === null ? 'Add course' : 'Edit course'">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="requiredRule('Title')" label="Title" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.provider" :rules="requiredRule('Provider')" label="Provider" variant="outlined"
          hide-details="auto" hint="Who teaches it — Stanford (CS107), MIT 6.5840." persistent-hint
          class="mb-4"></v-text-field>
        <v-text-field v-model="draft.url" :rules="requiredRule('Link')" label="Link" variant="outlined"
          hide-details="auto" hint="The course's own page or playlist, not a download."
          persistent-hint class="mb-4"></v-text-field>
        <v-row class="ma-0">
          <v-col cols="12" sm="6" class="pa-0 pr-sm-2 mb-4">
            <v-select v-model="draft.status" :items="STATUS_OPTIONS" item-title="label" item-value="value"
              :rules="selectRules({ fieldName: 'Status' })"
              label="Status" variant="outlined" hide-details="auto" density="comfortable"></v-select>
          </v-col>
          <v-col cols="12" sm="6" class="pa-0 pl-sm-2 mb-4">
            <v-text-field v-model="draft.year" :rules="nameRules({ fieldName: 'Term or year', maxLength: 40 })"
              label="Term or year" placeholder="Fall 2020" variant="outlined"
              hide-details="auto" density="comfortable"></v-text-field>
          </v-col>
        </v-row>
        <v-text-field v-model="draft.progress" :rules="nameRules({ fieldName: 'Progress', maxLength: 40 })"
          label="Progress" placeholder="lecture 4" variant="outlined"
          hide-details="auto" hint="Only shown while the status is Watching now." persistent-hint
          class="mb-4"></v-text-field>
        <v-textarea v-model="draft.note" :rules="longTextRules({ fieldName: 'Note', maxLength: 600 })"
          label="Note" variant="outlined" hide-details="auto" rows="2" auto-grow
          hint="Why it is here, or what it was good for." persistent-hint class="mb-4"></v-textarea>
      </v-form>
      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="saveCourse">{{ editingId === null ? 'Add course' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
/**
 * Courses: lecture series and taught courses being worked through.
 *
 * The shelf's sibling, and built the same way — grouped by where each one stands, rendered with the
 * site's row list, no thumbnails. What is being watched right now is the part a visitor is likely
 * to care about, so it sits at the top rather than in date order.
 */
import { computed, defineComponent, onMounted, ref } from 'vue';
import OwnerBar from '../components/admin/OwnerBar.vue';
import FeedbackNote from '../components/admin/FeedbackNote.vue';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading, useSettingsStore } from '../store';
import type { CourseStatus, CourseType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone, longTextRules, nameRules, selectRules } from '../utils';

const STATUS_OPTIONS: Array<{ value: CourseStatus, label: string }> = [
  { value: 'watching', label: 'Watching now' },
  { value: 'done', label: 'Finished' },
  { value: 'want', label: 'Want to take' },
];

const emptyCourse = (): CourseType => ({
  title: '', provider: '', url: '', status: 'want', progress: '', note: '', year: '',
});

export default defineComponent({
  name: 'Courses',
  components: { OwnerBar, FeedbackNote, LoadingComponent, InlineActions, EditorDialog },
  setup() {
    const apiLoading = useAPILoading();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const courses = ref<CourseType[]>([]);
    const editorOpen = ref(false);
    const editingId = ref<number | null>(null);
    const draft = ref<CourseType>(emptyCourse());
    const validForm = ref(false);
    const saving = ref(false);
    const busy = ref(false);

    // Cast rather than a typed key, matching Books: page copy is open-ended, and adding a page
    // should not mean widening a type that nothing else reads.
    const page = computed(() =>
      (settingsStore.profile?.pages as Record<string, { title?: string, intro?: string }>)?.courses);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Courses');
    const pageIntro = computed(() => page.value?.intro?.trim() || '');

    /** Human-readable form of a URL: no scheme, no trailing slash. Same rule as the shelf. */
    const readable = (url: string): string =>
      (url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

    const byStatus = (status: CourseStatus) =>
      courses.value.filter((c) => (c.status || 'want') === status);

    const groups = computed(() => [
      {
        status: 'watching' as CourseStatus,
        emoji: '📺',
        title: 'Watching now',
        intro: '',
        courses: byStatus('watching'),
      },
      {
        status: 'done' as CourseStatus,
        emoji: '✅',
        title: 'Finished',
        intro: '',
        courses: byStatus('done'),
      },
      {
        status: 'want' as CourseStatus,
        emoji: '🗂',
        title: 'Queued up',
        // Same as the shelf: array order is the reading order, and saying so is what stops the
        // sequence reading as an unsorted pile.
        intro: 'In the order I mean to work through them.',
        courses: byStatus('want'),
      },
    ]);

    const load = async () => {
      try {
        apiLoading.setLoading(true);
        const res = await apiFetch('/courses');
        const json = await res.json();
        courses.value = res.ok && Array.isArray(json.data) ? json.data : [];
      } catch {
        courses.value = [];
      } finally {
        apiLoading.setLoading(false);
      }
    };

    onMounted(load);

    const requiredRule = (field: string) => [(v: string) => Boolean((v || '').trim()) || `${field} is required`];

    const openCreate = () => {
      clear();
      editingId.value = null;
      draft.value = emptyCourse();
      editorOpen.value = true;
    };

    const openEdit = (course: CourseType) => {
      clear();
      editingId.value = course.id ?? null;
      draft.value = { ...emptyCourse(), ...deepClone(course) };
      editorOpen.value = true;
    };

    const saveCourse = async () => {
      try {
        saving.value = true;
        const isNew = editingId.value === null;
        const result = await apiJson<{ message?: string }>(
          isNew ? '/courses' : `/courses/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        );
        editorOpen.value = false;
        success(result.message || (isNew ? 'Course added.' : 'Course updated.'));
        await load();
      } catch (e: unknown) {
        error(e instanceof Error ? e.message : 'Failed to save the course.');
      } finally {
        saving.value = false;
      }
    };

    const removeCourse = async (course: CourseType) => {
      if (course.id === undefined) return;
      busy.value = true;
      // Optimistic removal, restored from the snapshot if the server refuses.
      const snapshot = courses.value;
      courses.value = courses.value.filter((c) => c.id !== course.id);
      try {
        const result = await apiJson<{ message?: string }>(`/courses/${course.id}`, { method: 'DELETE' });
        success(result.message || 'Course removed.');
      } catch (e: unknown) {
        courses.value = snapshot;
        error(e instanceof Error ? e.message : 'Failed to remove the course.');
      } finally {
        busy.value = false;
      }
    };

    return {
      STATUS_OPTIONS, apiLoading, isAdmin, courses, groups, readable,
      pageTitle, pageIntro, editorOpen, editingId, draft, validForm, saving, busy,
      requiredRule, openCreate, openEdit, saveCourse, removeCourse, responseType, responseMessage,
      selectRules, nameRules, longTextRules,
    };
  },
});
</script>

<style scoped>
.courses__head {
  margin-bottom: 2rem;
}

.courses__group {
  margin-bottom: 2.5rem;
}

.courses__group:last-child {
  margin-bottom: 0;
}

/* The row keeps the site's list shape: title block on the left, muted metadata on the right. */
.course {
  align-items: flex-start !important;
  gap: 1rem;
}

.course__main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.course__title {
  display: block;
}

.course__by {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-gray-color));
}

.course__note {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgb(var(--v-theme-gray-color));
}

.course__meta {
  flex: 0 0 auto;
  white-space: nowrap;
  align-self: center;
}

.course__tools {
  display: flex;
  align-items: center;
}

/* On a phone the address is noise next to a wrapping title, so it steps out of the way. */
@media (max-width: 600px) {
  .course__meta {
    display: none;
  }

  .course {
    gap: 0.5rem;
  }
}
</style>
