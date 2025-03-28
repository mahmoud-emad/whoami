<template>
    <v-alert v-if="hintMessage" :type="hintType" variant="tonal" class="mb-4">
        {{ hintMessage }}
    </v-alert>
    <v-select :loading="apiLoadingStore.isLoading()" :disabled="projects.length === 0" item-title="title"
        item-value="id" class="mb-4" label="Select project" variant="outlined" hide-details="auto" :items="projects"
        v-model="selectedProjectID">
    </v-select>
    <v-btn @click="deleteSelectedProject" :disabled="projects.length === 0 || selectedProjectID === null"
        title="When you press, the project will be deleted" class="mb-4" color="error" variant="tonal">Delete</v-btn>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { useAPILoading } from '../../store';
import { type ProjectType } from '../../types';

export default {
    setup() {
        const projects = ref([]);
        const selectedProjectID = ref(null);
        const apiLoadingStore = useAPILoading()
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const hintMessage = ref('');
        const hintType = ref<'error' | 'info' | 'success' | 'warning'>('info');

        onMounted(async () => {
            try {
                apiLoadingStore.setLoading(true)
                const res = await fetch(`${serverUrl}/projects`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                const result = await res.json();
                projects.value = result.data;
                if (projects.value.length === 0) {
                    hintMessage.value = 'No projects found';
                    hintType.value = 'error';
                }
            } catch (error) {
                console.error("Failed to load projects:", error);
            } finally {
                apiLoadingStore.setLoading(false)
            }
        })

        const deleteSelectedProject = async () => {
            try {
                apiLoadingStore.setLoading(true)
                await fetch(`${serverUrl}/projects/${selectedProjectID.value}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                });
                projects.value = projects.value.filter((project: ProjectType) => project.id !== selectedProjectID.value);
                selectedProjectID.value = null;
                hintMessage.value = 'Project deleted successfully';
                hintType.value = 'success';
            } catch (error) {
                console.error("Failed to delete project:", error);
            } finally {
                apiLoadingStore.setLoading(false)
                setTimeout(() => {
                    hintMessage.value = '';
                    hintType.value = 'info';
                }, 3000);
            }
        }

        return {
            deleteSelectedProject,
            apiLoadingStore,
            selectedProjectID,
            projects,
            hintMessage,
            hintType
        };
    }
};
</script>