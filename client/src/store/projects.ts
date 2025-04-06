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
            this.projects = data;
        },

        async createProject(project: ProjectType) {
            const data = await ProjectsAPI.createProject(project)
            this.projects.push(data);
        },

        async updateProject(project: ProjectType) {
            const data = await ProjectsAPI.updateProject(project)
            this.projects = this.projects.map((p) => {
                if (p.id === data.id) {
                    return data;
                }
                return p;
            });
        },

        async deleteProject(project: ProjectType) {
            await ProjectsAPI.deleteProject(project);
            this.projects = this.projects.filter((p) => p.id !== project.id);
        },

        getProjectsByType(type: string) {
            return this.projects.filter((p) => p.type === type);
        },
    },
});

export default useProjectsStore;