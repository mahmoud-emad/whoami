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
            if (data) {
                this.articles = data;
            }
        },

        async createArticle(article: ArticleType) {
            const data = await ArticlesAPI.createArticle(article);
            if (data) {
                this.articles.push(data);
            }
        },

        async updateArticle(article: ArticleType) {
            const data = await ArticlesAPI.updateArticle(article);
            if (data) {
                this.articles = this.articles.map((p) =>
                    p.id === data.id ? data : p
                );
            }
        },

        async deleteArticle(article: ArticleType) {
            const success = await ArticlesAPI.deleteArticle(article);
            if (success !== false) {
                this.articles = this.articles.filter((p) => p.id !== article.id);
            }
        }
    },
});

export default useArticlesStore;
