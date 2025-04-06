import { CustomResponse, ArticleType } from "../types"
import { axios } from "./axios"
import ServerErrorNotification from "./notifications"

class ArticlesAPI {
    /**
     * Get all articles
     * @returns {Promise<ArticleType[]>}
     * @static
    */
    static async getArticles(): Promise<ArticleType[]> {
        try {
            const response = await axios.get('/api/articles/')
            const res = response.data as CustomResponse<ArticleType[]>
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
     * Get a article by id
     * @param {number} id
     * @returns {Promise<ArticleType>}
     * @static     
    */
    static async getArticle(id: number): Promise<ArticleType | null> {
        try {
            const response = await axios.get(`/api/articles/${id}/`)
            const res = response.data as CustomResponse<ArticleType>
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
     * Create a article
     * @param {ArticleType} article
     * @returns {Promise<ArticleType | null>}
     * @static
    */
    static async createArticle(article: ArticleType): Promise<ArticleType | null> {
        try {
            const response = await axios.post('/api/articles/', {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(article),
            })
            const res = response.data as CustomResponse<ArticleType>
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
     * Update a article
     * @param {ArticleType} article
     * @returns {Promise<ArticleType | null>}
     * @static
    */
    static async updateArticle(article: ArticleType): Promise<ArticleType | null> {
        try {
            const response = await axios.put(`/api/articles/${article.id}/`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(article),
            })
            const res = response.data as CustomResponse<ArticleType>
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
     * Delete a article
     * @param {ArticleType} article
     * @returns {Promise<void>}
     * @static
    */
    static async deleteArticle(article: ArticleType): Promise<boolean> {
        try {
            await axios.delete(`/api/articles/${article.id}/`)
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

export default ArticlesAPI
