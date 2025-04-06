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
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return []
        }
    }

    /**
     * Get a project by id
     * @param {number} id
     * @returns {Promise<ProjectType | null>}
     * @static     
    */
    static async getProject(id: number): Promise<ProjectType | null> {
        try {
            const response = await axios.get(`/api/projects/${id}/`)
            const res = response.data as CustomResponse<ProjectType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Create a project
     * @param {ProjectType} project
     * @returns {Promise<ProjectType | null>}
     * @static
    */
    static async createProject(project: ProjectType): Promise<ProjectType | null> {
        try {
            const response = await axios.post('/api/projects/', {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(project),
            })
            const res = response.data as CustomResponse<ProjectType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Update a project
     * @param {ProjectType} project
     * @returns {Promise<ProjectType | null>}
     * @static
    */
    static async updateProject(project: ProjectType): Promise<ProjectType | null> {
        try {
            const response = await axios.put(`/api/projects/${project.id}/`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(project),
            })
            const res = response.data as CustomResponse<ProjectType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Delete a project
     * @param {ProjectType} project
     * @returns {Promise<void>}
     * @static
    */
    static async deleteProject(project: ProjectType): Promise<boolean> {
        try {
            await axios.delete(`/api/projects/${project.id}/`)
            return true
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return false
        }
    }
}

export default ProjectsAPI
