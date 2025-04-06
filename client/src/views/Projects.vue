<template>
  <div class="page-body">
    <div class="section mb-4">
      <h1>Projects</h1>
      <v-alert v-if="projects && projects.length" class="pa-2 mt-2 mb-2 head-card">
        💻 These are some of my projects, Check them on
        <strong>
          <a target="_blank" href="https://github.com/Mahmoud-Emad?tab=repositories">Github</a>
        </strong>
        to see the source code if supported.
      </v-alert>

      <!-- Loading State -->
      <LoadingComponent type="card" :content-length="4" :content-name="'Projects'" v-if="apiLoadingStore.isLoading()" />

      <!-- No projects found -->
      <div v-else-if="projects.length === 0" class="no-content-height">
        <v-alert class="pa-2 mt-2 mb-2 head-card">
          🎨 No projects found.
        </v-alert>
      </div>

      <!-- Projects -->
      <div class="projects" v-else>
        <v-row>
          <v-col cols="12" xl='6' md="6" sm="6" xs="12" v-for="(project, index) in projects" :key="index"
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

      <div v-if="projects && projects.length" class="text-center">
        <v-pagination :disabled="apiLoadingStore.loading" v-model="pageNumber" :length="pageSize"
          rounded="circle"></v-pagination>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ProjectCard from '../components/ProjectCard.vue';
import { onMounted, Ref, ref, watch } from 'vue';
import { ProjectType } from '../types';
import { useAPILoading } from '../store';
import LoadingComponent from '../components/LoadingComponent.vue';

export default {
  name: 'CustomProjects',
  components: { ProjectCard, LoadingComponent },
  setup() {
    const projects: Ref<ProjectType[]> = ref([]);
    const pageNumber = ref(1)
    const pageSize = ref(0)
    const apiLoadingStore = useAPILoading()

    const loadProjects = async (options: {
      page?: number;
      limit?: number;
      sort?: boolean;
    }) => {
      apiLoadingStore.setLoading(true)
      // try {
      //   const serverUrl = import.meta.env.VITE_SERVER_URL;
      //   const res = await fetch(`${serverUrl}/projects?page=${options.page}&limit=${options.limit}&sort=${options.sort}`);
      //   const result = await res.json();
      //   if (res.ok) {
      //     if (result.total === 0) {
      //       // TODO: No projects found, Handle it
      //       return;
      //     }
      //     projects.value = result.data;
      //     pageSize.value = Math.ceil(result.total / 10);
      //   } else {
      //     throw new Error(result.message || 'Failed to fetch projects');
      //     // console.error("Error adding project:", result.error);
      //   }
      // } catch (error) {
      //   console.error("Error adding project:", error);
      // }
      apiLoadingStore.setLoading(false)
    }

    onMounted(() => {
      loadProjects({
        page: pageNumber.value,
        limit: 10,
        sort: true
      });
    });

    watch(pageNumber, () => {
      loadProjects({
        page: pageNumber.value,
        limit: 10,
        sort: true
      });
    })

    return {
      apiLoadingStore,
      pageNumber,
      projects,
      pageSize,
    };
  },
};
</script>

<style scoped>
.text-info {
  font-weight: bold;
  color: #00c0ef;
}
</style>