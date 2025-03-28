<template>
  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>
  <v-form v-model="validForm">
    <v-text-field :rules="nameRules(
      {
        fieldName: 'Project Title',
        maxLength: 60,
        minLength: 4
      }
    )" v-model="project.title" title="Project Title" class="mb-4" label="Project Title" variant="outlined"
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
      label="Project Description" variant="outlined" hide-details="auto"></v-textarea>
    <v-btn :disabled="!validForm" @click="createNewProject(project)" title="Create Project" class="mb-4" color="primary"
      variant="tonal">Create
      Project</v-btn>
  </v-form>
</template>

<script lang="ts">
import { ref } from 'vue';
import { ProjectType } from '../../types';
import { nameRules, websiteRules, longTextRules, validateProjectTagsRules } from '../../utils';
import { useAPILoading } from '../../store';

export default {
  setup() {
    const apiLoading = useAPILoading();
    const validForm = ref(false);
    const responseType = ref('success');
    const responseMessage = ref();
    const projectTypes = ['Project', 'Open Source'];
    const projectTags = ref([
      'React', 'Vue', 'Angular', 'Flutter', 'NodeJS', 'PHP', 'Laravel', 'Spring', 'Django', 'Ruby on Rails',
      'Python', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Heroku', 'Netlify', 'Vercel', 'DigitalOcean',
      'Frontend', 'Backend', 'Fullstack', 'Mobile', 'Desktop', 'Web', 'Mobile', 'Desktop', 'Web', 'UI/UX',
      'Design', 'Development', 'Programming', 'Coding', 'Software', 'Hardware', 'Networking', 'Security',
      'Infrastructure', 'Data', 'Analytics', 'Machine Learning', 'Artificial Intelligence', 'Robotics', 'IoT',
      'JavaScript', 'TypeScript', 'C++', 'C#', 'Java', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala',
      'Dart', 'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Trello', 'Asana', 'Notion', 'Slack', 'Discord',
      'Zoom', 'Google Meet', 'Microsoft Teams', 'Zoom', 'Slack', 'Discord', 'Jira', 'Trello', 'Asana', 'Notion',
      'Commit Lint', 'Code Review', 'Pair Programming', 'Agile', 'Scrum', 'Kanban', 'Lean', 'Waterfall', 'Test-Driven Development',
      'Commit messages', 'Code reviews', 'Pair programming', 'Agile', 'Scrum', 'Kanban', 'Lean', 'Waterfall', 'Test-driven development',
      'express.js', 'expressjs'
    ].sort());

    const project = ref<ProjectType>({
      title: '',
      link: '',
      tags: [],
      description: '',
      background: 'transparent',
      type: 'project'
    });

    const createNewProject = async (project: ProjectType) => {
      try {
        apiLoading.setLoading(true)
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const res = await fetch(`${serverUrl}/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(project),
        });

        const result = await res.json();
        if (res.ok) {
          responseType.value = 'success';
          responseMessage.value = result.message;
          // We need to handle projects store
        } else {
          responseType.value = 'error';
          responseMessage.value = result.message;
          console.error("Error adding project:", result.error);
        }
      } catch (error) {
        console.error("Failed to write guestbook:", error);
      } finally {
        apiLoading.setLoading(false)
        setTimeout(() => {
          responseType.value = 'success';
          responseMessage.value = undefined;
        }, 3000);
      }
    }

    return {
      projectTags,
      project,
      validForm,
      responseType,
      responseMessage,
      projectTypes,
      createNewProject,
      nameRules,
      websiteRules,
      longTextRules,
      validateProjectTagsRules
    };
  }
};
</script>