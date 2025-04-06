import { CustomResponse, ProjectType } from "../types"
import { axios } from "./axios"
import ServerErrorNotification from "./notifications"


class ProjectsAPI {
    /**
     * Get all projects
     * @returns {Promise<ProjectType[]>}
     * @static
    */
    static async getProjects(): Promise<ProjectType[]> {
        try {
            console.log('getProjects')
            const response = await axios.get('/api/projects/')
            const res = response.data as CustomResponse<ProjectType[]>
            return res.results
        } catch (error: any) {
            // Display notification with the error message
            ServerErrorNotification.show({
                title: 'Error',
                message: error.message,
                type: 'error'
            });
            return []
        }
    }

    /**
     * Get a project by id
     * @param {number} id
     * @returns {Promise<ProjectType>}
     * @static     
    */
    static async getProject(id: number): Promise<ProjectType> {
        const response = await axios.get(`/api/projects/${id}/`)
        const res = response.data as CustomResponse<ProjectType>
        return res.results
    }

    /**
     * Create a project
     * @param {ProjectType} project
     * @returns {Promise<ProjectType>}
     * @static
    */
    static async createProject(project: ProjectType): Promise<ProjectType> {
        const response = await axios.post('/api/projects/', {
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(project),
        })
        const res = response.data as CustomResponse<ProjectType>
        return res.results
    }

    /**
     * Update a project
     * @param {ProjectType} project
     * @returns {Promise<ProjectType>}
     * @static
    */
    static async updateProject(project: ProjectType): Promise<ProjectType> {
        const response = await axios.put(`/api/projects/${project.id}/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(project),
        })
        const res = response.data as CustomResponse<ProjectType>
        return res.results
    }

    /**
     * Delete a project
     * @param {ProjectType} project
     * @returns {Promise<void>}
     * @static
    */
    static async deleteProject(project: ProjectType): Promise<void> {
        await axios.delete(`/api/projects/${project.id}/`)
    }
}

export default ProjectsAPI