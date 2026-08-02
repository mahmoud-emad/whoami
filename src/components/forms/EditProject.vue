<template>
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <!-- Project titles run long; select-menu-wrap lets the options wrap instead of being clipped to
       an ellipsis inside the teleported menu. -->
  <v-select :loading="apiLoadingStore.isLoading()" :disabled="projects.length === 0" item-title="title" item-value="id"
    class="mb-4" label="Select project to edit" variant="outlined" hide-details="auto" :items="projects"
    :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedProjectID" @update:model-value="loadProject">
  </v-select>

  <v-form v-if="selectedProjectID !== null" v-model="validForm" :disabled="apiLoadingStore.isLoading()">
    <v-text-field :rules="nameRules({
      fieldName: 'Project Title',
      maxLength: 60,
      minLength: 4
    })" v-model="project.title" title="Project Title" class="mb-4" label="Project Title" variant="outlined"
      hide-details="auto"></v-text-field>
    <v-text-field type="url" :rules="websiteRules()" v-model="project.link" title="Project Link" class="mb-4"
      label="Project Link" variant="outlined" hide-details="auto"></v-text-field>

    <v-select hide-details="auto" variant="outlined" :label="'Project Type'" v-model="project.type" class="mb-4"
      :items="projectTypes"></v-select>

    <v-autocomplete :rules="validateProjectTagsRules(project.tags)" v-model="project.tags" title="Project Tags"
      class="mb-4" label="Project Tags" variant="outlined" hide-details="auto" multiple hint="e.g., React, Vue, Angular"
      :items="projectTags">
      <template v-slot:chip="{ props, item }">
        <v-chip color="primary" v-bind="props" :text="item.raw"></v-chip>
      </template>
    </v-autocomplete>
    <v-textarea type="text" :rules="longTextRules({
      fieldName: 'Project Description',
      maxLength: 400,
      minLength: 60
    })" :counter="400" v-model="project.description" title="Project Description" class="mb-4"
      label="Project Description" variant="outlined" hide-details="auto" rows="3" auto-grow></v-textarea>
    <div class="form-actions mb-4">
      <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm || apiLoadingStore.isLoading()"
        @click="saveProject" title="Save Project" color="primary" variant="tonal">Save Changes</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { ProjectType } from '../../types';
import { nameRules, websiteRules, longTextRules, validateProjectTagsRules, deepClone } from '../../utils';
import { useAPILoading } from '../../store';
import { useFormFeedback } from '../../composables/useFormFeedback';

const PROJECT_TAGS = [
  'React', 'Vue', 'Angular', 'Flutter', 'NodeJS', 'PHP', 'Laravel', 'Spring', 'Django', 'Ruby on Rails',
  'Python', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Heroku', 'Netlify', 'Vercel', 'DigitalOcean',
  'Frontend', 'Backend', 'Fullstack', 'Mobile', 'Desktop', 'Web', 'UI/UX',
  'JavaScript', 'TypeScript', 'C++', 'C#', 'Java', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala',
  'Dart', 'Git', 'GitHub', 'GitLab', 'express.js', 'expressjs',
].sort();

const PROJECT_TYPES = ['Project', 'Open Source'];

const emptyProject = (): ProjectType => ({
  title: '',
  link: '',
  tags: [],
  description: '',
  background: 'transparent',
  type: 'project',
});

export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const projects = ref<ProjectType[]>([]);
    const selectedProjectID = ref<number | null>(null);
    const validForm = ref(false);
    const project = ref<ProjectType>(emptyProject());

    onMounted(async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/projects`);
        const result = await res.json();
        projects.value = result.data || [];
      } catch (e) {
        error('Failed to load projects.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    });

    const loadProject = (id: number | null) => {
      if (id === null) return;
      const found = projects.value.find((p) => p.id === id);
      if (found) project.value = deepClone(found);
    };

    const saveProject = async () => {
      if (selectedProjectID.value === null) return;
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/projects/${selectedProjectID.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project.value),
        });
        const result = await res.json();
        if (res.ok) {
          success(result.message);
          const idx = projects.value.findIndex((p) => p.id === selectedProjectID.value);
          if (idx !== -1) projects.value[idx] = result.data;
        } else {
          error(result.message || 'Failed to update project.');
        }
      } catch (e) {
        error('Failed to update project.');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      projects,
      selectedProjectID,
      project,
      validForm,
      responseType,
      responseMessage,
      projectTypes: PROJECT_TYPES,
      projectTags: PROJECT_TAGS,
      loadProject,
      saveProject,
      nameRules,
      websiteRules,
      longTextRules,
      validateProjectTagsRules,
    };
  },
};
</script>
