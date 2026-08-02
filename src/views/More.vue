<template>
  <div class="page-body">
    <!--
      Every card and link on this page comes from admin settings. Nothing is hardcoded any more:
      the page used to advertise pages like /uses and /impossible-list that were never built, so
      visitors landed on blank screens. Empty lists simply render nothing.
    -->
    <section class="section">
      <h1>What else can I find?</h1>
      <p v-if="intro">{{ intro }}</p>
    </section>

    <template v-if="cards.length">
      <div class="long-line opacity-80 mt-2 mb-2"></div>
      <section class="section hidden-pages">
        <v-row>
          <v-col v-for="(page, index) in cards" :key="index" cols="12" md="6">
            <ContactInfo :title="page.title" :description="page.description" :link="page.link"
              :linkText="page.linkText" :cols="display.mdAndUp.value" />
          </v-col>
        </v-row>
      </section>
    </template>

    <template v-if="shoebox.length">
      <div class="long-line opacity-80"></div>
      <section class="section">
        <h1>📦 Shoebox</h1>
        <p v-if="shoeboxIntro" class="mb-3">{{ shoeboxIntro }}</p>

        <v-row>
          <v-col class="pt-0 pb-0" v-for="(item, index) in shoebox" :key="index" cols="12" md="4" sm="12" xl="4">
            <ContactInfo :link="item.link" :linkText="item.name" :cols="display.mdAndUp.value" />
          </v-col>
        </v-row>
      </section>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useDisplay } from "vuetify";
import ContactInfo from "../components/ContactInfo.vue";
import { useSettingsStore } from "../store";
import type { MoreCard, MoreShoeboxItem } from "../types";

export default defineComponent({
  name: "MoreView",
  components: {
    ContactInfo,
  },
  setup() {
    const display = useDisplay();
    const settingsStore = useSettingsStore();

    const more = computed(() => settingsStore.profile?.more);

    const intro = computed(() => more.value?.intro?.trim() || '');
    const shoeboxIntro = computed(() => more.value?.shoeboxIntro?.trim() || '');

    /**
     * A card needs somewhere real to point, so entries without a link are dropped rather than
     * rendered as dead text. `show` lets an entry be parked without deleting it.
     */
    const cards = computed<MoreCard[]>(() =>
      (more.value?.cards || []).filter((c) => c.show !== false && c.link?.trim() && c.title?.trim())
    );

    const shoebox = computed<MoreShoeboxItem[]>(() =>
      (more.value?.shoebox || []).filter((i) => i.show !== false && i.link?.trim() && i.name?.trim())
    );

    return {
      display,
      intro,
      cards,
      shoeboxIntro,
      shoebox,
    };
  },
});
</script>

<style scoped>
/* General page styling */
.page-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Section styling */
.section {
  margin-bottom: 10px;
  margin-top: 10px;
}

.section h1,
.section h2 {
  margin-bottom: 16px;
  font-weight: 600;
}

/* Discover text styling */
.discover {
  text-decoration: underline;
  cursor: pointer;
  font-weight: 800;
  transition: color 0.3s ease;
}

/* Hidden pages section */
.hidden-pages {
  animation: fadeIn 0.5s ease-in-out;
}

/* Animation for hidden pages */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>