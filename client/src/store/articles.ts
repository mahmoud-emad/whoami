import { defineStore } from "pinia";
import ArticlesAPI from "../api/articles";
import { ArticleType } from "../types";

const useArticlesStore = defineStore('articlesStore', {
    state: () => ({
        articles: [] as Array<ArticleType>,
    }),
    getters: {
        getArticles: (state): ArticleType[] => state.articles,
    },
    actions: {
        async fetchArticles() {
            const data = await ArticlesAPI.getArticles();
            this.articles = data;
        },

        async createProject(article: ArticleType) {
            const data = await ArticlesAPI.createProject(article)
            this.articles.push(data);
        },

        async updateProject(article: ArticleType) {
            const data = await ArticlesAPI.updateProject(article)
            this.articles = this.articles.map((p) => {
                if (p.id === data.id) {
                    return data;
                }
                return p;
            });
        },

        async deleteProject(article: ArticleType) {
            await ArticlesAPI.deleteProject(article);
            this.articles = this.articles.filter((p) => p.id !== article.id);
        }
    },
});

export default useArticlesStore;