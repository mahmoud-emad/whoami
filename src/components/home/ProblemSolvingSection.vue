<template>
  <!--
    Hidden unless there is something to show: the section is switched on in settings, not hidden
    behind a hardcoded blurb and a link to someone else's repository.

    No `mt-3` and no `pa-2`: Home.vue owns the gap between sections, and the utility padding put
    this section's copy 8px to the right of its own heading.
  -->
  <div v-if="visible" class="problem-solving">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="section-intro">{{ intro }}</p>
    <p v-if="description" class="ps-copy" v-html="description"></p>
    <p v-if="repoUrl" class="ps-copy ps-copy--spaced">
      Would you like to challenge me? Open an issue on my
      <a class="body-link" :href="repoUrl" target="_blank" rel="noopener">
        problem-solving repository
      </a>.
    </p>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useSettingsStore } from '../../store';
import { sectionHeading } from '../../utils';

export default defineComponent({
  name: 'ProblemSolvingSection',
  setup() {
    const settingsStore = useSettingsStore();

    const section = computed(() => settingsStore.profile?.sections?.problemSolving);
    const ps = computed(() => settingsStore.profile?.problemSolving);

    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');
    const description = computed(() => ps.value?.description?.trim() || '');
    const repoUrl = computed(() => ps.value?.repoUrl?.trim() || '');

    // Two switches have to agree — the feature flag and the section's own `show` — and there has to
    // be some content. A heading over an empty block reads as a broken page.
    const visible = computed(() =>
      ps.value?.enabled !== false &&
      section.value?.show !== false &&
      Boolean(intro.value || description.value || repoUrl.value)
    );

    return { visible, heading, sectionTitle, intro, description, repoUrl };
  },
});
</script>

<style scoped>
.problem-solving {
  /* `description` is admin-authored HTML and can hold a long URL; this is what stops it widening
     the page on a phone. */
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Same measure and colour as .section-intro, so the intro, the description and the closing line
   read as one block of prose rather than three differently-styled paragraphs. */
.ps-copy {
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
}

.ps-copy--spaced {
  margin-top: 1rem !important;
}
</style>
