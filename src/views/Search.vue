<template>
  <div class="page-body search-page">
    <h1 class="page-title">{{ pageTitle }}</h1>
    <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>

    <v-text-field v-model="query" ref="input" label="Search this site" variant="outlined" hide-details="auto"
      class="mt-4 mb-6" prepend-inner-icon="mdi-magnify" clearable autofocus @keyup.enter="run"
      @click:clear="clear"></v-text-field>

    <v-alert v-if="disabled" type="info" variant="tonal" class="mb-4">
      Search is turned off for this site.
    </v-alert>

    <LoadingComponent v-else-if="loading" type="article" :content-length="3" content-name="Results" />

    <template v-else-if="submitted">
      <p class="search__summary">
        {{ total }} {{ total === 1 ? 'result' : 'results' }} for “{{ lastQuery }}”
      </p>

      <div v-if="!total" class="search__empty">
        <!-- The example used to name one of the original owner's projects, which meant nothing on
             anyone else's site. Generic advice works everywhere. -->
        <p>Nothing matched. Try a shorter word, or a different spelling.</p>
      </div>

      <!--
        One row per hit: bold title left, muted mono date right, a hairline between rows. The date
        drops under the title below 600px (see .row-list in style.css) so it never squeezes the
        title into a stub on a phone.
      -->
      <section v-for="group in groups" :key="group.model" class="search__group">
        <h2 class="search__group-title">{{ group.label }}</h2>
        <ul class="row-list">
          <li v-for="(item, i) in group.items" :key="i" class="row-list__item">
            <component :is="item.href ? 'a' : 'div'" :href="item.href" :target="item.external ? '_blank' : undefined"
              :rel="item.external ? 'noopener' : undefined" class="row-list__link">
              <span class="row-list__title">{{ item.title }}</span>
              <span v-if="item.date" class="row-list__meta">{{ item.date }}</span>
            </component>
            <p v-if="item.snippet" class="row-list__snippet">{{ item.snippet }}</p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../utils/api';
import LoadingComponent from '../components/LoadingComponent.vue';
import { useSettingsStore } from '../store';

type SearchResponse = {
  query: string;
  total: number;
  results: Record<string, any[]>;
};

const LABELS: Record<string, string> = {
  projects: 'Projects',
  articles: 'Articles',
  posts: 'Blog posts',
  guestbooks: 'Guestbook',
};

/**
 * Short date for the right-hand column of a result row. Deliberately not utils' `formatData`,
 * which prints the time as well: a row wants a date, not a timestamp, and the long form crowds the
 * title. Returns '' for anything unparseable so the column simply disappears.
 */
const rowDate = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Trim a body of text down to something readable under a result heading. */
const snippet = (text: unknown, max = 160): string => {
  if (typeof text !== 'string') return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

export default defineComponent({
  name: 'SearchView',
  components: { LoadingComponent },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const settingsStore = useSettingsStore();

    // Page chrome, so a default heading is fine; the intro only appears if someone writes one.
    const page = computed(() => settingsStore.profile?.pages?.search);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Search');
    const pageIntro = computed(() => page.value?.intro?.trim() || '');

    const query = ref<string>((route.query.q as string) || '');
    const lastQuery = ref('');
    const loading = ref(false);
    const disabled = ref(false);
    const submitted = ref(false);
    const total = ref(0);
    const results = ref<Record<string, any[]>>({});

    const groups = computed(() =>
      Object.entries(results.value)
        .filter(([, items]) => items.length)
        .map(([model, items]) => ({
          model,
          label: LABELS[model] || model,
          items: items.map((item) => {
            const date = rowDate(item.createdAt);
            if (model === 'projects' || model === 'articles') {
              return {
                title: item.title,
                snippet: snippet(item.description),
                href: item.link,
                external: true,
                date,
              };
            }
            if (model === 'posts') {
              return { title: item.title, snippet: snippet(item.content), href: '/blog', external: false, date };
            }
            return { title: item.name, snippet: snippet(item.message), href: '/guestbook', external: false, date };
          }),
        }))
    );

    const search = async (term: string) => {
      if (!term.trim()) {
        submitted.value = false;
        results.value = {};
        total.value = 0;
        return;
      }
      loading.value = true;
      try {
        const res = await apiFetch(`/search?q=${encodeURIComponent(term.trim())}`);
        if (res.status === 403) {
          disabled.value = true;
          return;
        }
        const data: SearchResponse = await res.json();
        results.value = data.results || {};
        total.value = data.total || 0;
        lastQuery.value = data.query || term;
        submitted.value = true;
      } catch {
        results.value = {};
        total.value = 0;
        submitted.value = true;
      } finally {
        loading.value = false;
      }
    };

    // Keep the URL as the source of truth so a search can be linked and reloaded.
    const run = () => {
      const term = (query.value || '').trim();
      if (!term) return;
      router.push({ path: '/search', query: { q: term } });
    };

    const clear = () => {
      query.value = '';
      submitted.value = false;
      results.value = {};
      total.value = 0;
      router.push({ path: '/search' });
    };

    onMounted(() => search(query.value));
    watch(
      () => route.query.q,
      (q) => {
        query.value = (q as string) || '';
        search(query.value);
      }
    );

    return { query, lastQuery, loading, disabled, submitted, total, groups, run, clear, pageTitle, pageIntro };
  },
});
</script>

<style scoped>
/* No max-width of its own: .c-container already sets the site's measure, and a second, narrower
   one here made this page's text start and stop at different edges from every other page. */
.search-page {
  min-width: 0;
}

.search__summary {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-gray-color));
  margin-bottom: 1.5rem !important;
}

.search__empty {
  color: rgb(var(--v-theme-gray-color));
}

.search__group {
  margin-bottom: 2.25rem;
}

.search__group:last-child {
  margin-bottom: 0;
}

/* Mono, uppercase, accent — the same label device the hero's eyebrow and the experience states
   use. It marks a group of data rather than being a heading in its own right, which is why it is
   smaller than .section-heading instead of a second size in the heading scale. */
.search__group-title {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link-hover-color));
  margin-bottom: 0.5rem !important;
}

/* A snippet belongs to the row above it, so the row gives up some of its own bottom padding
   instead of the pair reading as two separate blocks. */
.row-list__link:has(+ .row-list__snippet) {
  padding-bottom: 0.2rem;
}

.row-list__item:has(.row-list__snippet) {
  padding-bottom: 0.6rem;
}
</style>
