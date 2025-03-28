<template>
    <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
        variant="tonal">{{ responseMessage }}</v-alert>
    <v-form @submit.prevent="postNewArticle(article)" v-model="validForm" :disabled="apiLoadingStore.isLoading()">
        <v-text-field :loading="apiLoadingStore.isLoading()" :rules="nameRules({
            fieldName: 'Article Title',
            maxLength: 120,
            minLength: 10,
        })" v-model="article.title" title="Article Title" class="mb-4" label="Article Title" variant="outlined"
            hide-details="auto"></v-text-field>
        <v-text-field type="url" :loading="apiLoadingStore.isLoading()" v-model="article.link" :rules="websiteRules()"
            title="Article Link" class="mb-4" label="Article Link" variant="outlined"
            hide-details="auto"></v-text-field>
        <v-textarea :loading="apiLoadingStore.isLoading()" type="text" :rules="article.description?.length ? longTextRules({
            fieldName: 'Article Description',
            maxLength: 400,
            minLength: 20
        }) : []" :counter="400" v-model="article.description" title="Article Description" class="mb-4"
            label="Article Description" variant="outlined" hide-details="auto"></v-textarea>
        <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm || apiLoadingStore.isLoading()"
            title="When pressed, it will create a new article" @click="postNewArticle(article)" class="mb-4"
            color="primary" variant="tonal">Create
            Article</v-btn>
    </v-form>
</template>

<script lang="ts">
import { ref } from 'vue';
import { ArticleType } from '../../types';
import { nameRules, websiteRules, longTextRules } from '../../utils';
import { useAPILoading } from '../../store';


export default {
    setup() {
        const validForm = ref(false);
        const apiLoadingStore = useAPILoading();
        const responseMessage = ref<string>();
        const responseType = ref<"success" | "error">();
        const article = ref<ArticleType>({
            link: '',
            title: '',
            description: '',
        });

        const postNewArticle = async (article_: ArticleType) => {
            try {
                apiLoadingStore.setLoading(true);
                const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/articles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(article_),
                })
                if (res.ok) {
                    const result = await res.json();
                    article.value = result.data;
                    responseMessage.value = result.message;
                    responseType.value = 'success';
                }
            } catch (error: any) {
                console.error(error);
                responseMessage.value = "Failed to create article: " + error.message;
                responseType.value = 'error';
            } finally {
                apiLoadingStore.setLoading(false);
                if (responseType.value == 'success') {
                    setTimeout(() => {
                        responseMessage.value = undefined;
                    }, 3000);
                }
            }
        };

        return {
            article,
            validForm,
            apiLoadingStore,
            responseMessage,
            responseType,
            nameRules,
            websiteRules,
            longTextRules,
            postNewArticle,
        };
    }
};
</script>