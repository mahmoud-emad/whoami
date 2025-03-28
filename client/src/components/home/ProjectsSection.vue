<template>
  <div class="last-projects">
    <h2 class="title" title="Last Projects">🎨 Last Projects</h2>
    <div class="pa-2">
      <p class="text-light-gray">
        Checkout my last projects.
      </p>
    </div>

    <div class="projects pa-2">
      <LoadingComponent :type="'card'" :content-length="2" :content-name="'Last Projects'"
        v-if="apiLoadingStore.isLoading()" />
      <div v-else>
        <div v-if="projects.length">
          <v-row>
            <v-col xl='6' cols="12" md="6" sm="6" xs="12" v-for="(project, index) in projects" :key="index"
              class="d-flex justify-start align-center">
              <ProjectCard :project="project" />
            </v-col>
          </v-row>
          <small class="ml-4">
            > Check out my
            <a href="https://github.com/Mahmoud-Emad" target="_blank"
              style="font-family: system-ui !important; text-decoration: underline">
              GitHub profile
            </a>
            for more projects.
          </small>
        </div>
        <div class="" v-else>
          <v-alert type="info" variant="tonal" class="mb-4">
            No projects found
          </v-alert>
        </div>
      </div>
    </div>
  </div>

  <!-- Open Source contributions -->
  <div class="open-source mt-3">
    <h2 class="title" title="Open Source Contributions">🌟 Open Source Contributions</h2>
    <div class="pa-2">
      <p class="text-light-gray">
        Contributing to open source projects is a great way to learn and grow as a developer.
      </p>
    </div>

    <div class="projects pa-2">
      <LoadingComponent :type="'card'" :content-length="2" :content-name="'Open Source Contributions'"
        v-if="apiLoadingStore.isLoading()" />
      <div v-else>
        <div v-if="opensource.length">
          <v-row>
            <v-col xl='6' cols="12" md="6" sm="6" xs="12" v-for="(package_, index) in opensource" :key="index"
              class="d-flex justify-start align-center">
              <ProjectCard :project="package_" />
            </v-col>
          </v-row>
          <small class="ml-4">
            > Check out my
            <a href="https://github.com/Mahmoud-Emad" target="_blank"
              style="font-family: system-ui !important; text-decoration: underline">
              GitHub profile
            </a>
            for more packages.
          </small>
        </div>
        <div class="" v-else>
          <v-alert type="info" variant="tonal" class="mb-4">
            No open source contributions found
          </v-alert>
        </div>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import ProjectCard from '../ProjectCard.vue';
import { onMounted, Ref, ref } from 'vue';
import { ProjectType } from '../../types';
import { useAPILoading } from '../../store';
import LoadingComponent from '../LoadingComponent.vue';
import { formatData } from '../../utils';


export default {
  name: 'ProjectsSection',
  components: { ProjectCard, LoadingComponent },

  setup() {
    onMounted(async () => {
      await loadProjects();
    });

    const apiLoadingStore = useAPILoading()
    // Projects Data
    const projects: Ref<ProjectType[]> = ref([]);
    // Open Source Data
    const opensource: Ref<ProjectType[]> = ref([]);

    const loadProjects = async () => {
      try {
        apiLoadingStore.setLoading(true)
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const res = await fetch(`${serverUrl}/projects`);
        const result = await res.json();
        if (res.ok) {
          if (result.total === 0) {
            // TODO: No projects found, Handle it
            return;
          }

          // Load only the last inserted 2 projects if their type is project
          const responseData = result.data
          const isProject = (project: ProjectType) => project.type.toLowerCase() == 'project';
          const projectsData = responseData.filter((project: ProjectType) => isProject(project)) as ProjectType[];

          if (projectsData.length > 2) {
            // Get the last 2 projects in the array
            projects.value = projectsData.slice(Math.max(projectsData.length - 2, 0))
          } else {
            projects.value = projectsData;
          }

          // Load only the last inserted 2 packages
          const isOpenSource = (project: ProjectType) => project.type.toLowerCase() == 'open source';
          const openSourceProjects = responseData.filter((project: ProjectType) => isOpenSource(project));

          if (openSourceProjects.length > 2) {
            opensource.value = openSourceProjects.slice(-2);
          } else {
            opensource.value = openSourceProjects;
          }
        } else {
          console.error("Error adding project:", result.error);
        }
      } catch (error) {
        console.error("Error adding project:", error);
      } finally {
        apiLoadingStore.setLoading(false)
      }
    }

    return {
      projects,
      formatData,
      opensource,
      apiLoadingStore,
    };
  },
};
</script>
