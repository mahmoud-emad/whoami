import { ProjectType } from "../types"
import { axios } from "./axios"


class ProjectsAPI {
    /**
     * Get all projects
     * @returns {Promise<ProjectType[]>}
     * @static
    */
    static async getProjects(): Promise<ProjectType[]> {
        console.log('getProjects')
        const response = await axios.get('/api/projects/', { timeout: 10000000 })
        console.log({ response })
        return response.data.json()
    }

    /**
     * Get a project by id
     * @param {number} id
     * @returns {Promise<ProjectType>}
     * @static     
    */
    static async getProject(id: number): Promise<ProjectType> {
        const response = await axios.get(`/api/projects/${id}/`, {
            timeout: 10000000
        })
        return response.data.json()
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
        return response.data.json()
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
        return response.data.json()
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