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

        async createArticle(article: ArticleType) {
            const data = await ArticlesAPI.createArticle(article)
            this.articles.push(data);
        },

        async updateArticle(article: ArticleType) {
            const data = await ArticlesAPI.updateArticle(article)
            this.articles = this.articles.map((p) => {
                if (p.id === data.id) {
                    return data;
                }
                return p;
            });
        },

        async deleteArticle(article: ArticleType) {
            await ArticlesAPI.deleteArticle(article);
            this.articles = this.articles.filter((p) => p.id !== article.id);
        }
    },
});

export default useArticlesStore;