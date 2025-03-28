<template>
  <div class="articles mt-3">
    <h2 class="title" title="Favourite Articles">🌟 Favourite Articles</h2>
    <LoadingComponent type="article" :content-length="2" :content-name="'Favourite Articles'"
      v-if="apiLoadingStore.isLoading()" />

    <div class="article pa-2" v-else>
      <div v-if="articles.length">
        <v-row v-for="(article, index) in articles" :key="index" class="d-flex justify-space-between align-center">
          <v-col :cols="display.mdAndUp.value ? 8 : 12" class="d-flex justify-start align-center">
            <a style="font-family: system-ui !important;" target="_blank" :href="article.link" class="article-link">
              <v-icon color="primary" size="20">
                mdi-note-edit-outline
              </v-icon>
              {{ article.title.length > 60 ? article.title.slice(0, 60) + '...' : article.title }}
            </a>
          </v-col>
          <v-col v-if="display.mdAndUp.value" cols="4" class="d-flex justify-end align-center">
            <p class="text-light-gray">{{ formatData(article.createdAt!) }}</p>
          </v-col>
        </v-row>
      </div>
      <div class="" v-else>
        <v-alert type="info" variant="tonal" class="mb-4">
          No articles found
        </v-alert>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import { onMounted, Ref, ref } from 'vue';
import { ArticleType } from '../../types';
import { useAPILoading } from '../../store';
import LoadingComponent from '../LoadingComponent.vue';
import { formatData } from '../../utils';
import { useDisplay } from 'vuetify';


export default {
  name: 'ArticlesSection',
  components: { LoadingComponent },

  setup() {
    // Vuetify display utility
    const display = useDisplay();

    onMounted(async () => {
      await loadArticles();
    });

    const apiLoadingStore = useAPILoading()
    const articles: Ref<ArticleType[]> = ref([]);
    const page = ref(1)

    const loadArticles = async () => {
      apiLoadingStore.setLoading(true)
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        const res = await fetch(`${serverUrl}/articles`);
        const result = await res.json();
        if (res.ok) {
          if (result.total === 0) {
            // TODO: No articles found, Handle it
            return;
          }
          articles.value = result.data;
        } else {
          console.error("Error adding article:", result.error);
        }
      } catch (error) {
        console.error("Error adding article:", error);
      }
      apiLoadingStore.setLoading(false)
    }

    return {
      apiLoadingStore,
      articles,
      display,
      page,
      formatData,
    };
  },
};
</script>
