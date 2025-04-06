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
            console.log('getArticles')
            const response = await axios.get('/api/articles/')
            const res = response.data as CustomResponse<ArticleType[]>
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
     * Get a article by id
     * @param {number} id
     * @returns {Promise<ArticleType>}
     * @static     
    */
    static async getArticle(id: number): Promise<ArticleType> {
        const response = await axios.get(`/api/articles/${id}/`)
        const res = response.data as CustomResponse<ArticleType>
        return res.results
    }

    /**
     * Create a article
     * @param {ArticleType} article
     * @returns {Promise<ArticleType>}
     * @static
    */
    static async createArticle(article: ArticleType): Promise<ArticleType> {
        const response = await axios.post('/api/articles/', {
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(article),
        })
        const res = response.data as CustomResponse<ArticleType>
        return res.results
    }

    /**
     * Update a article
     * @param {ArticleType} article
     * @returns {Promise<ArticleType>}
     * @static
    */
    static async updateArticle(article: ArticleType): Promise<ArticleType> {
        const response = await axios.put(`/api/articles/${article.id}/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(article),
        })
        const res = response.data as CustomResponse<ArticleType>
        return res.results
    }

    /**
     * Delete a article
     * @param {ArticleType} article
     * @returns {Promise<void>}
     * @static
    */
    static async deleteArticle(article: ArticleType): Promise<void> {
        await axios.delete(`/api/articles/${article.id}/`)
    }
}

export default ArticlesAPI