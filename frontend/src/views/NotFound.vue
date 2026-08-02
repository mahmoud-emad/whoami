<template>
  <div class="page-body notfound">
    <p class="notfound__code">404</p>
    <h1 class="page-title">{{ pageTitle }}</h1>
    <p class="page-intro notfound__body">{{ pageIntro }}</p>

    <div class="notfound__links">
      <router-link to="/" class="notfound__link">Home</router-link>
      <router-link to="/projects" class="notfound__link">Projects</router-link>
      <router-link to="/blog" class="notfound__link">Blog</router-link>
      <router-link to="/contact" class="notfound__link">Contact</router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useSettingsStore } from '../store';

export default defineComponent({
  name: 'NotFoundView',
  setup() {
    const settingsStore = useSettingsStore();

    // Both strings are UI chrome — a 404 page has to explain itself even before anyone configures
    // the site — so the built-in English text stays as the default.
    const page = computed(() => settingsStore.profile?.pages?.notFound);
    const pageTitle = computed(() => page.value?.title?.trim() || 'This page does not exist yet.');
    const pageIntro = computed(
      () =>
        page.value?.intro?.trim() ||
        'The link you followed points somewhere that has not been built. Nothing is broken on your side. Try one of these instead.'
    );

    return { pageTitle, pageIntro };
  },
});
</script>

<style scoped>
/* Vertical padding only: the left edge is the page's, not this component's, and the max-width it
   used to set was a second, narrower measure than every other page. */
.notfound {
  padding: 3.5rem 0 2.5rem;
  min-width: 0;
}

.notfound__code {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  color: rgb(var(--v-theme-link-hover-color));
  margin-bottom: 0.8rem !important;
}

.notfound__body {
  margin-top: 1rem !important;
}

.notfound__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.6rem;
}

/* inline-flex + min-height keeps these at a comfortable ~40px thumb target; the padding alone left
   them at 33px. */
.notfound__link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

.notfound__link:hover {
  border-color: rgb(var(--v-theme-link-hover-color));
  background: rgba(var(--v-theme-link-hover-color), 0.1);
}

.notfound__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
}
</style>
