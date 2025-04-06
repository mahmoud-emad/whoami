import { defineStore } from "pinia";
import ProjectsAPI from "../api/projects";
import { ProjectType } from "../types";

const useProjectsStore = defineStore('projectsStore', {
    state: () => ({
        projects: [] as Array<ProjectType>,
    }),
    getters: {
        getProjects: (state): ProjectType[] => state.projects,
    },
    actions: {
        async fetchProjects() {
            const data = await ProjectsAPI.getProjects();
            if (data) {
                this.projects = data;
            }
        },

        async createProject(project: ProjectType) {
            const data = await ProjectsAPI.createProject(project);
            if (data) {
                this.projects.push(data);
            }
        },

        async updateProject(project: ProjectType) {
            const data = await ProjectsAPI.updateProject(project);
            if (data) {
                this.projects = this.projects.map((p) =>
                    p.id === data.id ? data : p
                );
            }
        },

        async deleteProject(project: ProjectType) {
            const success = await ProjectsAPI.deleteProject(project);
            if (success !== false) {
                this.projects = this.projects.filter((p) => p.id !== project.id);
            }
        },

        getProjectsByType(type: string) {
            return this.projects.filter((p) => p.type === type);
        },
    },
});

export default useProjectsStore;
