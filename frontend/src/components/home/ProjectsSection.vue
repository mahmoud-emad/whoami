<template>
  <!--
    One component renders either the "selected work" block or the "open source" block, picked by the
    `section` prop, because the home page orders those two independently (profile.sections.order).
    Hidden entirely when the section is switched off or has nothing in it — an empty block with a
    "none found" notice makes a portfolio look unfinished.
  -->
  <div v-if="visible" :class="section === 'openSource' ? 'open-source mt-3' : 'last-projects'">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <div v-if="intro" class="pa-2">
      <p class="text-light-gray">{{ intro }}</p>
    </div>

    <!-- Sits after the heading rather than wrapping it, so the signed-out layout is untouched. -->
    <OwnerBar class="pa-2">
      <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" :title="createTitle"
        class="text-capitalize" @click="openCreate">{{ createLabel }}</v-btn>
      <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
    </OwnerBar>

    <div class="projects pa-2">
      <LoadingComponent :type="'card'" :content-length="2" :content-name="sectionTitle || 'Projects'"
        v-if="apiLoadingStore.isLoading()" />
      <div v-else-if="visibleItems.length">
        <v-row>
          <v-col xl='6' cols="12" md="6" sm="6" xs="12" v-for="(project, index) in visibleItems" :key="index"
            class="d-flex justify-start align-stretch">
            <ProjectCard :project="project" :editable="isAdmin" @edit="openEdit" @remove="removeProject"
              @toggle-hidden="toggleProjectHidden" />
          </v-col>
        </v-row>
        <!-- Only offered when a GitHub profile is actually configured. -->
        <small v-if="githubProfileUrl" class="ml-4">
          Check out my
          <a :href="githubProfileUrl" target="_blank" rel="noopener" class="body-link">
            GitHub profile
          </a>
          for more.
        </small>
      </div>
    </div>

    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <v-text-field v-model="draft.title" :rules="nameRules({
          fieldName: 'Project Title',
          maxLength: 60,
          minLength: 4
        })" title="Project Title" label="Project Title" variant="outlined" hide-details="auto"
          class="mb-4"></v-text-field>
        <v-text-field v-model="draft.link" type="url" :rules="websiteRules()" title="Project Link" label="Project Link"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-select v-model="draft.type" :items="projectTypes" :rules="selectRules({ fieldName: 'Project Type' })"
          label="Project Type" variant="outlined" hide-details="auto"
          class="mb-4"></v-select>
        <v-combobox v-model="draft.tags" :items="knownTags" :rules="tagsRules({ fieldName: 'Project Tags' })"
          title="Project Tags" label="Project Tags" multiple chips closable-chips
          hint="Up to 4. Type a tag and press enter to add your own." persistent-hint variant="outlined"
          hide-details="auto" class="mb-4"></v-combobox>
        <v-textarea v-model="draft.description" :rules="longTextRules({
          fieldName: 'Project Description',
          maxLength: 400,
          minLength: 60
        })" :counter="400" title="Project Description" label="Project Description" variant="outlined"
          hide-details="auto" rows="3" auto-grow class="mb-4"></v-textarea>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving" class="text-capitalize"
          @click="saveProject">{{ editingId === null ? 'Create project' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<style scoped>

</style>

<script lang="ts">
import ProjectCard from '../ProjectCard.vue';
import OwnerBar from '../../components/admin/OwnerBar.vue';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { apiFetch, apiJson } from '../../utils/api';
import { computed, defineComponent, onMounted, Ref, ref, watch } from 'vue';
import { ProjectType } from '../../types';
import { useAPILoading, useSettingsStore } from '../../store';
import LoadingComponent from '../LoadingComponent.vue';
import EditorDialog from '../admin/EditorDialog.vue';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';
import { deepClone, longTextRules, nameRules, sectionHeading, selectRules, tagsRules, websiteRules } from '../../utils';

const PROJECT_TYPES = ['Project', 'Open Source'];

/**
 * When a project was last touched, as a timestamp for sorting. Falls back through updatedAt ->
 * createdAt -> 0, so an entry missing both sorts last instead of poisoning the comparison with NaN.
 */
const touchedAt = (project: ProjectType): number => {
  const stamp = project.updatedAt || project.createdAt || '';
  const ms = Date.parse(stamp);
  return Number.isNaN(ms) ? 0 : ms;
};

// How many projects the home page shows. The full list lives on /projects.
const HOME_PROJECT_LIMIT = 4;
const HOME_OPEN_SOURCE_LIMIT = 2;

/**
 * Both instances of this component (selected work + open source) need the same /projects payload,
 * and they mount together. A short-lived shared promise collapses that into one request without
 * caching long enough to serve stale data to someone navigating back after an edit.
 */
const SHARED_FETCH_MS = 3000;
let shared: { at: number; promise: Promise<ProjectType[]> } | null = null;

/**
 * Bumped after every owner write. Both mounted sections watch it, because a single edit can move a
 * card from "selected work" to "open source" — the section that was not edited has to reload too.
 * `cacheVersion` makes the two watchers share one refetch instead of firing two.
 */
const projectsVersion = ref(0);
let cacheVersion = 0;
const invalidateProjects = () => { projectsVersion.value += 1; };

const fetchProjects = async (): Promise<ProjectType[]> => {
  const res = await apiFetch('/projects');
  const result = await res.json();
  if (!res.ok) throw new Error(result?.error || 'Failed to load projects');
  return (result.data || []) as ProjectType[];
};

const loadAllProjects = (): Promise<ProjectType[]> => {
  const now = Date.now();
  if (!shared || cacheVersion !== projectsVersion.value || now - shared.at > SHARED_FETCH_MS) {
    cacheVersion = projectsVersion.value;
    const promise = fetchProjects().catch((error) => {
      shared = null; // never cache a failure
      throw error;
    });
    shared = { at: now, promise };
  }
  return shared.promise;
};

export default defineComponent({
  name: 'ProjectsSection',
  components: { OwnerBar, FeedbackNote, ProjectCard, LoadingComponent, EditorDialog },
  props: {
    section: {
      type: String as () => 'projects' | 'openSource',
      default: 'projects',
    },
  },

  setup(props) {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const items: Ref<ProjectType[]> = ref([]);

    /** Same rule as the Projects page: dimmed for the owner, absent for everyone else. */
    const visibleItems = computed(() =>
      items.value.filter((project) => isAdmin.value || project.show !== false)
    );
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    // In-place editing state, mirroring the /projects page.
    const editorOpen = ref(false);
    const editingId = ref<number | null>(null);
    const validForm = ref(false);
    const saving = ref(false);

    // A project created from the open-source block should be an open-source project, not land in the
    // other section and disappear from view.
    const sectionType = computed<ProjectType['type']>(() =>
      props.section === 'openSource' ? 'Open Source' : 'project'
    );

    const emptyProject = (): ProjectType => ({
      title: '',
      link: '',
      tags: [],
      description: '',
      background: 'transparent',
      type: sectionType.value,
    });

    const draft = ref<ProjectType>(emptyProject());

    const knownTags = computed(() => {
      const seen = new Set<string>();
      items.value.forEach((project) => (project.tags || []).forEach((tag) => seen.add(tag)));
      return [...seen].sort();
    });

    const config = computed(() => settingsStore.profile?.sections?.[props.section]);
    const heading = computed(() => sectionHeading(config.value));
    const sectionTitle = computed(() => config.value?.title?.trim() || '');
    const intro = computed(() => config.value?.intro?.trim() || '');

    const githubProfileUrl = computed(() =>
      settingsStore.profile?.socials?.githubUrl?.trim() ||
      settingsStore.configuration?.githubURL?.trim() ||
      ''
    );

    // The owner keeps the block even when it is empty — otherwise an empty section offers nowhere to
    // add the first project. A section switched off in settings stays off for everyone.
    const visible = computed(() =>
      config.value?.show !== false &&
      // Counts what actually renders: a section whose every project is hidden must not leave an
      // empty block behind for a visitor.
      (isAdmin.value || apiLoadingStore.isLoading() || visibleItems.value.length > 0)
    );

    const createLabel = computed(() => (props.section === 'openSource' ? 'New open source' : 'New project'));
    const createTitle = computed(() => `Create a new ${sectionType.value === 'project' ? 'project' : 'open source project'}`);
    const editorTitle = computed(() => (editingId.value === null ? createLabel.value : 'Edit project'));

    const load = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const all = await loadAllProjects();
        const wanted = props.section === 'openSource' ? 'open source' : 'project';
        const matching = all
          .filter((project) => (project.type || '').toLowerCase() === wanted)
          // Hidden projects are filtered out *before* the cap, not after: otherwise one of them
          // would eat a slot and a visitor would be shown three projects instead of four. The
          // full list, hidden ones included, is on /projects, which is where they are managed.
          .filter((project) => project.show !== false);

        // Most recently touched first. `updatedAt` is set on every edit and `createdAt` only on
        // creation, so the fallback makes a project that has never been edited sort by when it
        // was added. Sorting on the dates rather than on array order is the point: the previous
        // code reversed the array, which is insertion order and says nothing about recency.
        items.value = [...matching]
          .sort((a, b) => touchedAt(b) - touchedAt(a))
          .slice(0, props.section === 'openSource' ? HOME_OPEN_SOURCE_LIMIT : HOME_PROJECT_LIMIT);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const openCreate = () => {
      clear();
      editingId.value = null;
      draft.value = emptyProject();
      editorOpen.value = true;
    };

    const openEdit = (project: ProjectType) => {
      clear();
      editingId.value = project.id ?? null;
      // Clone so the card behind the dialog is not edited live.
      draft.value = { ...emptyProject(), ...deepClone(project) };
      editorOpen.value = true;
    };

    const saveProject = async () => {
      try {
        saving.value = true;
        const isNew = editingId.value === null;
        const result = await apiJson<{ message?: string }>(
          isNew ? '/projects' : `/projects/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        );
        editorOpen.value = false;
        success(result.message || (isNew ? 'Project created.' : 'Project updated.'));
        // Reconcile through the shared cache so the sibling section sees the change too.
        invalidateProjects();
      } catch (e: any) {
        error(e?.message || 'Failed to save the project.');
      } finally {
        saving.value = false;
      }
    };


    /**
     * Hide or show a project. Reversible, so unlike delete it fires on the first click.
     *
     * Optimistic, with the previous list kept so a failed write puts the card back the way the
     * owner left it rather than silently disagreeing with the server.
     */
    const toggleProjectHidden = async (project: ProjectType) => {
      if (project.id === undefined) return;
      const nextShown = project.show === false;
      const snapshot = items.value.map((item) => ({ ...item }));
      items.value = items.value.map((item) =>
        item.id === project.id ? { ...item, show: nextShown } : item
      );
      try {
        await apiJson(`/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...project, show: nextShown }),
        });
      } catch (e: any) {
        items.value = snapshot;
        error(e?.message || 'Failed to change that.');
      }
    };

    const removeProject = async (project: ProjectType) => {
      if (project.id === undefined) return;
      // Optimistic removal, restored from the snapshot if the server refuses.
      const snapshot = items.value;
      items.value = items.value.filter((item) => item.id !== project.id);
      try {
        const result = await apiJson<{ message?: string }>(`/projects/${project.id}`, { method: 'DELETE' });
        success(result.message || 'Project deleted.');
      } catch (e: any) {
        items.value = snapshot;
        error(e?.message || 'Failed to delete the project.');
      } finally {
        invalidateProjects();
      }
    };

    // Every write goes through the version counter, so both sections reload from one request.
    watch(projectsVersion, () => load());

    onMounted(load);

    return {
      items,
      heading,
      sectionTitle,
      intro,
      visible,
      githubProfileUrl,
      apiLoadingStore,
      isAdmin,
      editorOpen,
      editorTitle,
      editingId,
      draft,
      validForm,
      saving,
      knownTags,
      createLabel,
      createTitle,
      projectTypes: PROJECT_TYPES,
      responseType,
      responseMessage,
      openCreate,
      openEdit,
      saveProject,
      removeProject,
      visibleItems,
      toggleProjectHidden,
      nameRules,
      websiteRules,
      longTextRules,

      selectRules,

      tagsRules,

    };
  },
});
</script>
