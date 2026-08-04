<template>
  <div class="page-body">
    <div class="section mb-4">
      <h1>{{ pageTitle }}</h1>
      <v-alert v-if="pageIntro" class="pa-2 mt-2 mb-2 head-card">
        {{ pageIntro }}
      </v-alert>

      <!-- Owner-only: create a project from the page it appears on, instead of the dashboard. -->
      <div v-if="isAdmin" class="owner-bar">
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Create a new project"
          class="text-capitalize" @click="openCreate">New project</v-btn>
      </div>
      <!-- List-level feedback (deletes, failed saves). While the dialog is open it shows in there. -->
      <FeedbackNote v-if="isAdmin && !editorOpen && responseMessage" :message="responseMessage" :type="responseType" class="mt-3" />
    </div>
    <LoadingComponent type="card" :content-length="4" :content-name="'Projects'" v-if="apiLoadingStore.isLoading()" />
    <div class="projects pa-2 mb-4" v-else>
      <v-row>
        <v-col cols="12" xl='6' md="6" sm="6" xs="12" v-for="(project, index) in visibleProjects" :key="index"
          class="d-flex justify-start align-stretch">
          <ProjectCard :project="project" :editable="isAdmin" @edit="openEdit" @remove="removeProject"
            @toggle-hidden="toggleProjectHidden" />
        </v-col>
      </v-row>
      <!-- Only shown when a GitHub profile is configured; there is no default account to link to. -->
      <small v-if="githubProfileUrl" class="ml-4">
        > Check out my
        <a :href="githubProfileUrl" target="_blank" rel="noopener" class="body-link">
          GitHub profile
        </a>
        for more projects.
      </small>
    </div>

    <div class="text-center">
      <v-pagination :disabled="apiLoadingStore.loading" v-model="pageNumber" :length="pageSize"
        rounded="circle"></v-pagination>
    </div>

    <!-- Create/edit shell. Mounted only for the owner, so a visitor never loads the form at all. -->
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
          label="Project Type" variant="outlined"
          hide-details="auto" class="mb-4"></v-select>
        <!-- Combobox rather than the dashboard's fixed autocomplete list: suggestions come from tags
             already in use here, and anything new can simply be typed. -->
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

<script lang="ts">
import ProjectCard from '../components/ProjectCard.vue';
import FeedbackNote from '../components/admin/FeedbackNote.vue';
import { apiFetch, apiJson } from '../utils/api';
import { computed, onMounted, Ref, ref, watch } from 'vue';
import { ProjectType } from '../types';
import { useAPILoading, useSettingsStore } from '../store';
import LoadingComponent from '../components/LoadingComponent.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone, longTextRules, nameRules, selectRules, tagsRules, websiteRules } from '../utils';

const PROJECT_TYPES = ['Project', 'Open Source'];

const PROJECTS_PER_PAGE = 10;

const emptyProject = (): ProjectType => ({
  title: '',
  link: '',
  tags: [],
  description: '',
  background: 'transparent',
  type: 'project',
});

export default {
  name: 'Projects',
  components: { FeedbackNote, ProjectCard, LoadingComponent, EditorDialog },
  setup() {
    const projects: Ref<ProjectType[]> = ref([]);

    /**
     * Hidden projects stay on the page for the owner, dimmed, so one can be brought back from the
     * same place it was hidden. A visitor never sees them at all.
     */
    const visibleProjects = computed(() =>
      projects.value.filter((project) => isAdmin.value || project.show !== false)
    );
    const pageNumber = ref(1)
    const pageSize = ref(0)
    const apiLoadingStore = useAPILoading()
    const settingsStore = useSettingsStore()
    const { isAdmin } = useAdmin()
    const { responseType, responseMessage, success, error, clear } = useFormFeedback()

    // In-place editing state. `editingId === null` means the dialog is creating rather than editing.
    const editorOpen = ref(false)
    const editingId = ref<number | null>(null)
    const draft = ref<ProjectType>(emptyProject())
    const validForm = ref(false)
    const saving = ref(false)

    const editorTitle = computed(() => (editingId.value === null ? 'New project' : 'Edit project'))

    // Tag suggestions come from what is already on the page, so the list stays relevant to this site
    // instead of being a hardcoded catalogue of every framework in existence.
    const knownTags = computed(() => {
      const seen = new Set<string>()
      projects.value.forEach((project) => (project.tags || []).forEach((tag) => seen.add(tag)))
      return [...seen].sort()
    })

    // Heading and intro are page chrome, so a plain English default is fine; the GitHub link is
    // identity, so it only appears once someone configures their own profile URL.
    const page = computed(() => settingsStore.profile?.pages?.projects)
    const pageTitle = computed(() => page.value?.title?.trim() || 'Projects')
    const pageIntro = computed(() => page.value?.intro?.trim() || '')
    const githubProfileUrl = computed(() =>
      settingsStore.profile?.socials?.githubUrl?.trim() ||
      settingsStore.configuration?.githubURL?.trim() ||
      ''
    )

    const loadProjects = async (options: {
      page?: number;
      limit?: number;
      sort?: boolean;
    }) => {
      apiLoadingStore.setLoading(true)
      try {
        const res = await apiFetch(`/projects?page=${options.page}&limit=${options.limit}&sort=${options.sort}`);
        const result = await res.json();
        if (res.ok) {
          // An empty result has to clear the list, not bail out: after deleting the last project the
          // old early return left the deleted card on screen until a full page reload.
          projects.value = result.total === 0 ? [] : result.data;
          pageSize.value = Math.ceil((result.total || 0) / PROJECTS_PER_PAGE);
        } else {
          console.error("Error adding project:", result.error);
        }
      } catch (error) {
        console.error("Error adding project:", error);
      }
      apiLoadingStore.setLoading(false)
    }

    /** Re-read the page currently on screen. Used to reconcile after every write. */
    const reload = () => loadProjects({ page: pageNumber.value, limit: PROJECTS_PER_PAGE, sort: true })

    const openCreate = () => {
      clear()
      editingId.value = null
      draft.value = emptyProject()
      editorOpen.value = true
    }

    const openEdit = (project: ProjectType) => {
      clear()
      editingId.value = project.id ?? null
      // Clone so typing in the dialog does not mutate the card behind it before anything is saved.
      draft.value = { ...emptyProject(), ...deepClone(project) }
      editorOpen.value = true
    }

    const saveProject = async () => {
      try {
        saving.value = true
        const isNew = editingId.value === null
        const result = await apiJson<{ message?: string }>(
          isNew ? '/projects' : `/projects/${editingId.value}`,
          { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(draft.value) },
        )
        editorOpen.value = false
        success(result.message || (isNew ? 'Project created.' : 'Project updated.'))
        // The server assigns id/createdAt and may normalise fields, so the list is re-read rather
        // than patched from the draft.
        await reload()
      } catch (e: any) {
        error(e?.message || 'Failed to save the project.')
      } finally {
        saving.value = false
      }
    }


    /**
     * Hide or show a project. Reversible, so unlike delete it fires on the first click.
     *
     * Optimistic, with the previous list kept so a failed write puts the card back the way the
     * owner left it rather than silently disagreeing with the server.
     */
    const toggleProjectHidden = async (project: ProjectType) => {
      if (project.id === undefined) return;
      const nextShown = project.show === false;
      const snapshot = projects.value.map((item) => ({ ...item }));
      projects.value = projects.value.map((item) =>
        item.id === project.id ? { ...item, show: nextShown } : item
      );
      try {
        await apiJson(`/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...project, show: nextShown }),
        });
      } catch (e: any) {
        projects.value = snapshot;
        error(e?.message || 'Failed to change that.');
      }
    };

    const removeProject = async (project: ProjectType) => {
      if (project.id === undefined) return
      // Optimistic: the card goes immediately, and comes back if the server refuses.
      const snapshot = projects.value
      projects.value = projects.value.filter((item) => item.id !== project.id)
      try {
        const result = await apiJson<{ message?: string }>(`/projects/${project.id}`, { method: 'DELETE' })
        success(result.message || 'Project deleted.')
      } catch (e: any) {
        projects.value = snapshot
        error(e?.message || 'Failed to delete the project.')
      } finally {
        await reload()
      }
    }

    onMounted(() => {
      loadProjects({
        page: pageNumber.value,
        limit: PROJECTS_PER_PAGE,
        sort: true
      });
    });

    watch(pageNumber, () => {
      loadProjects({
        page: pageNumber.value,
        limit: PROJECTS_PER_PAGE,
        sort: true
      });
    })

    return {
      apiLoadingStore,
      pageNumber,
      projects,
      pageSize,
      pageTitle,
      pageIntro,
      githubProfileUrl,
      isAdmin,
      editorOpen,
      editorTitle,
      editingId,
      draft,
      validForm,
      saving,
      knownTags,
      projectTypes: PROJECT_TYPES,
      responseType,
      responseMessage,
      openCreate,
      visibleProjects,
      toggleProjectHidden,
      openEdit,
      saveProject,
      removeProject,
      nameRules,
      websiteRules,
      longTextRules,

      selectRules,

      tagsRules,

    };
  },
};
</script>

<style scoped>
.section {
  margin-bottom: 24px;
}

/* Owner-only row under the page intro. Wraps so the button never pushes the page sideways. */
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.text-info {
  font-weight: bold;
  color: rgb(var(--v-theme-link-hover-color));
}
</style>