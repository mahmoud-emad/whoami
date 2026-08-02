<template>
  <div class="home page-body">
    <!--
      Dividers are drawn by CSS between adjacent visible sections rather than hardcoded here.
      Sections hide themselves when they have no content, and a hardcoded divider would leave a
      rule hanging over nothing.
    -->
    <!--
      Order comes from profile.sections.*.order, so an owner can put experience above the projects
      or drop a section entirely without touching this file. Each component still decides for itself
      whether it has anything to render.
    -->
    <div class="sections">
      <template v-for="key in orderedSections" :key="key">
        <IntroSection v-if="key === 'intro'" />
        <ExperienceSection v-else-if="key === 'experience'" />
        <ProjectsSection v-else-if="key === 'projects'" section="projects" />
        <ProjectsSection v-else-if="key === 'openSource'" section="openSource" />
        <ProplemSolvingSection v-else-if="key === 'problemSolving'" />
        <ArticleSection v-else-if="key === 'articles'" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import IntroSection from '../components/home/IntroSection.vue';
import ExperienceSection from '../components/home/ExperienceSection.vue';
import ArticleSection from '../components/home/ArticlesSection.vue';
import ProplemSolvingSection from '../components/home/ProblemSolvingSection.vue';
import ProjectsSection from '../components/home/ProjectsSection.vue';
import { useSettingsStore } from '../store';
import { useAdmin } from '../composables/useAdmin';
import type { SectionConfig } from '../types';

type SectionKey = 'intro' | 'experience' | 'projects' | 'openSource' | 'problemSolving' | 'articles';

// Order used when settings are missing or a section has no `order` — the historical layout.
const DEFAULT_ORDER: Record<SectionKey, number> = {
  intro: 1,
  experience: 2,
  projects: 3,
  openSource: 4,
  problemSolving: 5,
  articles: 6,
};

const SECTION_KEYS = Object.keys(DEFAULT_ORDER) as SectionKey[];

export default defineComponent({
  name: 'Home',
  components: {
    IntroSection,
    ExperienceSection,
    ArticleSection,
    ProjectsSection,
    ProplemSolvingSection
  },

  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();

    const orderedSections = computed<SectionKey[]>(() => {
      const sections = settingsStore.profile?.sections as Partial<Record<SectionKey, SectionConfig>> | undefined;
      const orderOf = (key: SectionKey) => {
        const order = sections?.[key]?.order;
        return typeof order === 'number' ? order : DEFAULT_ORDER[key];
      };
      // The owner keeps every section mounted, including hidden ones. Filtering them out here
      // would unmount the section's own in-place editor the moment it was switched off, leaving
      // no way to switch it back on from the page. Each section renders its own "hidden from
      // visitors" state instead.
      return SECTION_KEYS
        .filter((key) => isAdmin.value || sections?.[key]?.show !== false)
        .sort((a, b) => orderOf(a) - orderOf(b));
    });

    return { orderedSections };
  },
});
</script>

<style scoped>
.v-btn {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/*
  A rule between adjacent sections, drawn by the sections themselves. Sections that render
  nothing are absent from the DOM, so no divider is left stranded above empty space.
*/
.sections> :not(:first-child) {
  border-top: 1px solid rgb(var(--v-theme-border-color));
  margin-top: 2.5rem;
  padding-top: 2.5rem;
}

@media (max-width: 600px) {
  .sections> :not(:first-child) {
    margin-top: 1.75rem;
    padding-top: 1.75rem;
  }
}
</style>