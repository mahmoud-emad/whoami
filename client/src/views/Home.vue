<template>
  <div class="home page-body">
    <!-- Sections -->
    <div class="sections">
      <!-- intro -->
      <IntroSection />
      <div class="long-line opacity-80 mt-2 mb-2"></div>
      <!-- Last Projects -->
      <ProjectsSection />
      <div class="long-line opacity-80 mt-2 mb-2"></div>
      <!-- Problem Solving -->
      <ProplemSolvingSection />
      <div class="long-line opacity-80 mt-2 mb-2"></div>
      <!-- Favourite Articles -->
      <ArticleSection />
    </div>
  </div>
</template>

<script lang="ts">
import IntroSection from '../components/home/IntroSection.vue';
import ArticleSection from '../components/home/ArticlesSection.vue';
import ProplemSolvingSection from '../components/home/ProblemSolvingSection.vue';
import ProjectsSection from '../components/home/ProjectsSection.vue';


export default {
  name: 'CustomHome',
  components: {
    IntroSection,
    ArticleSection,
    ProjectsSection,
    ProplemSolvingSection
  },

  setup() {
    return {
    };
  },
};
</script>

<style scoped>
.v-btn {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>