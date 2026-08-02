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
            label="Article Description" variant="outlined" hide-details="auto" rows="3" auto-grow></v-textarea>
        <div class="form-actions mb-4">
            <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm || apiLoadingStore.isLoading()"
                title="When pressed, it will create a new article" @click="postNewArticle(article)" color="primary"
                variant="tonal">Create Article</v-btn>
        </div>
    </v-form>
</template>

<script lang="ts">
import { ref } from 'vue';
import { apiFetch } from '../../utils/api';
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
                const res = await apiFetch(`/articles`, {
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